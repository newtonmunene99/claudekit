// The status line, as a mod: usage pills above the prompt and folder ·
// branch · model · name · id under it. Engine
// figures are read live while drawing ($.session.usage() is free); events and
// a timer only ask for a redraw.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ZERO_TOKENS, addUsage, barSegments, identityText, modelName } from './format'
import { buildPills } from './pills'
import type { Icon, Tone } from './pills'

export const tokens = atom({ plugin: 'statusline', key: 'tokens' } as const, ZERO_TOKENS)

// Soft backgrounds like the reference screenshot; bar colours by level.
const TONE: Record<Tone, string> = {
  green: '#d9eedf',
  purple: '#e6def5',
  grey: '#e6e6e6',
  red: '#f6dcd6',
  blue: '#dbe3f6',
  yellow: '#f6ecd2',
}
// A deeper shade of each pill's tint, for its icons.
const ACCENT: Record<Tone, string> = {
  green: '#4f8a5c',
  purple: '#7a5cc4',
  grey: '#6f6f6f',
  red: '#c0563f',
  blue: '#4a64b8',
  yellow: '#b58a1b',
}
const LEVEL = { ok: '#5a9a68', warn: '#c9a227', high: '#c8553d' } as const
const INK = '#2b2b2b'
const TRACK = '#bdbdbd'

// Nerd Font icons in the terminal (the same fonts that carry the Powerline
// caps); plain Unicode elsewhere, where an empty one is left out.
const ICONS: Record<'nerd' | 'plain', Record<Icon, string>> = {
  nerd: {
    limit5h: '\u{F04C5}',
    limit7d: '\u{F0B67}',
    context: '\u{F07AF}',
    reset: '\uEA82',
    input: '\uF093',
    output: '\uF019',
    cache: '\uEBD2',
    cost: '\uF155',
  },
  plain: { limit5h: '', limit7d: '', context: '', reset: '↻', input: '↑', output: '↓', cache: '≋', cost: '$' },
}

// Boxes have no corner radius, so each pill ends in half-disc glyphs in its
// own colour. The terminal's are Powerline's (Ghostty bundles them; a font
// without them shows boxes, hence the square option); other surfaces get
// plain Unicode half circles.
const CAPS = { terminal: ['', ''], other: ['◖', '◗'] } as const

export const identity = atom({ plugin: 'statusline', key: 'identity' } as const, null)
const title = atom({ plugin: 'statusline', key: 'title' } as const, null)

async function git($: EngineInterface, root: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await $.process.run(['git', '-C', root, '--no-optional-locks', ...args], { timeoutMs: 3000 })
    return stdout.trim()
  } catch {
    return null
  }
}

// Folder, branch (short sha when detached, none outside a repo), dirty mark
// and model, as the old status line script showed them.
async function refreshIdentity($: EngineInterface): Promise<void> {
  const root = await $.session.root()
  const folder = root.split('/').filter(Boolean).pop() ?? root
  const model = modelName(await $.session.model())
  let branch: string | null = null
  let isDirty = false
  if ((await git($, root, ['rev-parse', '--is-inside-work-tree'])) === 'true') {
    const [current, status] = await Promise.all([
      git($, root, ['branch', '--show-current']),
      git($, root, ['status', '--porcelain']),
    ])
    branch = current || (await git($, root, ['rev-parse', '--short', 'HEAD']))
    isDirty = Boolean(status)
  }
  const text = identityText(folder, branch, isDirty, model, await read($, title), await $.session.id())
  if (text !== (await read($, identity))) await update($, identity, () => text)
}

// Git can be slow in a big repo: refresh in the background so no turn waits.
function refreshIdentityLater($: EngineInterface): void {
  refreshIdentity($).catch(() => {})
}

async function noteTitle($: EngineInterface, name: string | undefined): Promise<void> {
  const next = name?.trim() || null
  if (next === (await read($, title))) return
  await update($, title, () => next)
  refreshIdentityLater($)
}

function redraw($: EngineInterface): void {
  $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  const isRound = options.ends !== 'square'
  const isPlainIcons = options.icons === 'plain'

  // A passed reset time drops off with the clock, not with an event.
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    $.clock.every(30_000, () => redraw($))
    refreshIdentityLater($)
    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    // A subagent's turn changes nothing the line shows.
    if (!e.agentId) refreshIdentityLater($)
    return done
  })

  // The session's name only arrives on these settings-hook events; a /rename
  // shows from the next prompt on.
  on('classic.SessionStart', async ($, e, next) => {
    await noteTitle($, e.session_title)
    return next(e)
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    await noteTitle($, e.session_title)
    return next(e)
  })

  // Dim at the end of the engine's own hint line; the terminal draws it,
  // other surfaces ignore tail for now.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const tail = await read($, identity)
    return tail ? next({ ...e, props: { ...e.props, tail } }) : next(e)
  })

  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    redraw($)
    return measured
  })

  // Every model request, main thread and subagents: the cost figure counts
  // them all, so the token totals do too. Writing state redraws the band.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const usage = result?.usage
    if (usage) await update($, tokens, t => addUsage(t ?? ZERO_TOKENS, usage))
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const usage = await $.session.usage()
    const pills = buildPills(usage, await read($, tokens), Date.now())
    const beneath = await next(e)
    if (pills.length === 0) return beneath
    const { Box, Text } = $.ui.resolve(e)
    const [left, right] = e.surface === 'terminal' ? CAPS.terminal : CAPS.other
    const icons = ICONS[e.surface === 'terminal' && !isPlainIcons ? 'nerd' : 'plain']
    return (
      // No width on this outer box: the engine refuses its own drawing
      // (beneath) under a Box with a width, and would drop the whole band.
      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap" gap={1} width={e.props.bodyColumns}>
          {pills.map(p => (
            <Box key={p.key} flexDirection="row">
              {isRound && <Text color={TONE[p.tone]}>{left}</Text>}
              <Box flexDirection="row" gap={1} paddingX={isRound ? 0 : 1} backgroundColor={TONE[p.tone]}>
                {p.parts.map((part, i) => {
                  const key = `${p.key}-${i}`
                  const bg = TONE[p.tone]
                  if (part.kind === 'icon') {
                    const glyph = icons[part.icon]
                    return glyph ? (
                      <Text key={key} color={ACCENT[p.tone]} backgroundColor={bg}>
                        {glyph}
                      </Text>
                    ) : null
                  }
                  if (part.kind === 'bar') {
                    const { filled, empty } = barSegments(part.percent)
                    return (
                      <Box key={key} flexDirection="row">
                        {filled > 0 && (
                          <Text color={LEVEL[part.level]} backgroundColor={bg}>
                            {'━'.repeat(filled)}
                          </Text>
                        )}
                        <Text color={INK} backgroundColor={bg} bold>
                          ┃
                        </Text>
                        {empty > 0 && (
                          <Text color={TRACK} backgroundColor={bg}>
                            {'━'.repeat(empty)}
                          </Text>
                        )}
                      </Box>
                    )
                  }
                  return (
                    <Text key={key} color={INK} backgroundColor={bg} bold={part.isBold} dimColor={part.isDim}>
                      {part.text}
                    </Text>
                  )
                })}
              </Box>
              {isRound && <Text color={TONE[p.tone]}>{right}</Text>}
            </Box>
          ))}
        </Box>
        {beneath}
      </Box>
    )
  })
}
