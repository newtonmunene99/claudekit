// Usage band above the prompt and folder · branch · model under it. Engine
// figures are read live while drawing ($.session.usage() is free); events and
// a timer only ask for a redraw.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ZERO_TOKENS, addUsage, identityText, modelName } from './format'
import { buildPills } from './pills'
import type { Tone } from './pills'

export type On = Parameters<Register>[0]

export const tokens = atom({ plugin: 'mods', key: 'usageTokens' } as const, ZERO_TOKENS)

// Soft backgrounds like the reference screenshot; bar colours by level.
const TONE: Record<Tone, string> = {
  green: '#d9eedf',
  purple: '#e6def5',
  grey: '#e6e6e6',
  red: '#f6dcd6',
  blue: '#dbe3f6',
  yellow: '#f6ecd2',
}
const LEVEL = { ok: '#5a9a68', warn: '#c9a227', high: '#c8553d' } as const
const INK = '#2b2b2b'

export const identity = atom({ plugin: 'mods', key: 'usageIdentity' } as const, null)

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
  const text = identityText(folder, branch, isDirty, model)
  if (text !== (await read($, identity))) await update($, identity, () => text)
}

// Git can be slow in a big repo: refresh in the background so no turn waits.
function refreshIdentityLater($: EngineInterface): void {
  refreshIdentity($).catch(() => {})
}

function redraw($: EngineInterface): void {
  $.ui.invalidate('ui.render')
}

export function registerUsage(on: On): void {
  // Countdowns move with the clock, not with events.
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
    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {pills.map(p => (
            <Box key={p.key} flexDirection="row" gap={1} paddingX={1} backgroundColor={TONE[p.tone]}>
              {p.parts.map((part, i) => (
                <Text
                  key={`${p.key}-${i}`}
                  color={part.level ? LEVEL[part.level] : INK}
                  backgroundColor={TONE[p.tone]}
                  bold={part.isBold}
                  dimColor={part.isDim}
                >
                  {part.text}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
        {beneath}
      </Box>
    )
  })
}
