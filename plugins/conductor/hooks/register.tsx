// Conductor HUD: a status line, a band above the prompt, a /conductor-board
// pane, milestone toasts, an upgrade nudge, and a guard that keeps todo
// status changes on conductor_state.py. All data comes from that script, so
// the HUD never parses plans itself.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { changesStatus, denyReason, isPlanPath, rewritesConductorFile } from './guard'
import { hasBand, inFlightPlans, milestones, pickTrack, statusText, toSnapshot } from './snapshot'

type Json = Record<string, any>

const PANE = 'conductor-board'
const snapshot = atom({ plugin: 'conductor', key: 'snapshot' } as const, null)
const isBandHidden = atom({ plugin: 'conductor', key: 'isBandHidden' } as const, false)

// The band's colours match the statusline mod's pills, so the two read as one.
const TONE = {
  purple: '#e6def5',
  grey: '#e6e6e6',
  red: '#f6dcd6',
  yellow: '#f6ecd2',
  blue: '#dbe3f6',
} as const
const INK = '#2b2b2b'
const ACCENT = '#7a5cc4'
const TRACK = '#b5b5b5'
const LEVEL = { ok: '#5a9a68' } as const

// Section headings of the board: an icon and a colour each.
const HEAD = {
  next: { icon: '▸', color: ACCENT },
  phases: { icon: '◔', color: '#5a9a68' },
  waiting: { icon: '◷', color: '#4a6fb5' },
  person: { icon: '!', color: '#c8553d' },
  others: { icon: '◆', color: ACCENT },
  tracks: { icon: '≡', color: '#8a8a8a' },
} as const

const BAR_WIDTH = 10

// Filled and empty cells of a done/total bar.
function barCells(done: number, total: number): [string, string] {
  const filled = total ? Math.round((done / total) * BAR_WIDTH) : 0
  return ['█'.repeat(filled), '░'.repeat(BAR_WIDTH - filled)]
}

// Boxes have no corner radius, so chips end in half-disc glyphs in their own
// colour. The terminal's are Powerline's (Ghostty bundles them; the `ends`
// option squares them for fonts without); a desktop gets Unicode half circles
// and keeps its native, already rounded, buttons.
const CAPS = { terminal: ['\ue0b6', '\ue0b4'], other: ['◖', '◗'] } as const

// The track mark spins while a turn runs. The timer starts on the first draw
// that sees one and stops on the first that does not.
const SPIN = ['◐', '◓', '◑', '◒']
let spin: { timer: { cancel: () => void }; frame: number } | null = null

function spinFrame($: EngineInterface): string {
  if (!spin) {
    const next = { frame: 0, timer: $.clock.every(250, () => {
      next.frame += 1
      $.ui.invalidate('ui.render')
    }) }
    spin = next
  }
  return SPIN[spin.frame % SPIN.length] ?? '◆'
}

function stopSpin(): void {
  spin?.timer.cancel()
  spin = null
}

const scriptPath = ($: EngineInterface) => `${$.plugin.root}/scripts/conductor_state.py`

// Module state resets on reload; session.start then fires again and refills it.
let lastKey = ''
// Plans of the tracks in progress at the last run; their mtimes are in the key.
let watchedPlans: string[] = []
// The guard only steers to set-todo when python3 can actually run it.
let isScriptUsable = false

async function runScript($: EngineInterface, args: string[]): Promise<Json | null> {
  try {
    const { stdout } = await $.process.run(['python3', scriptPath($), ...args], {
      cwd: await $.session.root(),
      timeoutMs: 8000,
    })
    isScriptUsable = true
    return JSON.parse(stdout) as Json
  } catch {
    return null
  }
}

// The status line only while the band is not showing the same track.
async function syncStatus($: EngineInterface): Promise<void> {
  const s = await read($, snapshot)
  const isBandShown = hasBand(s) && !(await read($, isBandHidden))
  $.ui.status(isBandShown ? undefined : statusText(s))
}

async function mtime($: EngineInterface, path: string): Promise<number> {
  try {
    return (await $.fs.stat(path)).mtimeMs
  } catch {
    return 0
  }
}

// Re-runs the script only when tracks.md or a plan in progress changed, so
// calling this after every edit costs a few stats.
async function refresh($: EngineInterface, force = false): Promise<void> {
  const root = await $.session.root()
  const tracksFile = `${root}/conductor/context/tracks.md`
  const prev = await read($, snapshot)
  if (!(await $.fs.exists(tracksFile))) {
    if (prev !== null) await update($, snapshot, () => null)
    $.ui.status(undefined)
    return
  }
  const planMtimes = async (plans: string[]) =>
    Object.fromEntries(await Promise.all(plans.map(async p => [p, await mtime($, `${root}/${p}`)] as const)))
  const watched = await planMtimes(watchedPlans)
  const key = [await mtime($, tracksFile), ...watchedPlans.map(p => watched[p])].join(':')
  if (!force && key === lastKey) return
  lastKey = key

  const tracks = await runScript($, ['tracks'])
  if (!tracks || tracks.error) return
  // tracks.md may have started or finished a track since the key was taken.
  const plans = inFlightPlans(tracks)
  const mtimes = plans.join() === watchedPlans.join() ? watched : await planMtimes(plans)
  watchedPlans = plans
  const track = pickTrack(tracks, mtimes)
  const plan = track?.plan ? await runScript($, ['plan', track.plan]) : null
  // The board lists every track in flight, so read the others' plans too.
  const others = ((tracks.tracks ?? []) as Json[]).filter(
    t => t.plan && t.track_id !== track?.track_id && (tracks.in_progress ?? []).includes(t.track_id),
  )
  const otherPlans = Object.fromEntries(
    await Promise.all(others.map(async t => [t.track_id, await runScript($, ['plan', t.plan])] as const)),
  )
  const next = toSnapshot(tracks, plan, mtimes, otherPlans)
  await update($, snapshot, () => next)
  await syncStatus($)
  for (const line of milestones(prev, next)) $.ui.toast(line, { timeoutMs: 6000 })
}

async function nudgeUpgrade($: EngineInterface): Promise<void> {
  const doctor = await runScript($, ['doctor'])
  // A version stamp alone is no drift: every plugin release would nag otherwise.
  const issues: Json[] = (doctor?.issues ?? []).filter(
    (i: Json) => i.id !== 'not_set_up' && i.fix !== 'stamp',
  )
  if (issues.length === 0) return
  const from = doctor?.project_version ?? 'unstamped'
  $.ui.toast(
    `Conductor files are behind (${from} → ${doctor?.plugin_version}, ${issues.length} ` +
      `issue${issues.length === 1 ? '' : 's'}). Run /conductor:conductor-setup to upgrade.`,
    { timeoutMs: 10000 },
  )
}

// Shared by /conductor-board and the band's Board button. The button calls this
// directly: a plugin's own $.command.run skips its own command.run hook, so the
// command would come back unanswered.
async function openBoard($: EngineInterface): Promise<string> {
  await update($, isBandHidden, () => false)
  await refresh($, true)
  const opened = await $.ui.open({ id: PANE, title: 'Conductor' })
  return opened.isPlaced
    ? 'Conductor board opened.'
    : 'Conductor board is waiting for a wider terminal.'
}

export const register: Register = (on, options) => {
  const isRound = options.ends !== 'square'

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: 'conductor-board',
      description: 'Show the Conductor track board in a pane',
    })
    await refresh($, true)
    if (await read($, snapshot)) await nudgeUpgrade($)
    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refresh($)
    return done
  })

  // Guard: todo status changes go through set-todo.
  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    isScriptUsable && isPlanPath(e.file_path) && changesStatus(e.old_string, e.new_string)
      ? { deny: denyReason(scriptPath($)) }
      : next(e),
  )

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (isScriptUsable && isPlanPath(e.file_path) && (await $.fs.exists(e.file_path))) {
      const before = await $.fs.read(e.file_path)
      if (changesStatus(before, e.content)) return { deny: denyReason(scriptPath($)) }
    }
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) =>
    isScriptUsable && rewritesConductorFile(e.command)
      ? { deny: denyReason(scriptPath($)) }
      : next(e),
  )

  // Keep the HUD live mid-turn: these are the tools that change conductor/.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'Bash') await refresh($)
    return ran
  })

  // Always answers: a hook that throws is skipped, and the engine then says no
  // hook answered the command, hiding the real failure.
  on('command.run', { command: 'conductor-board' }, async $ => {
    try {
      return { text: await openBoard($) }
    } catch (err) {
      return { text: `Conductor board could not open: ${err instanceof Error ? err.message : err}` }
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snapshot)
    if (e.props.hasSurvey || !hasBand(s) || !s?.plan || (await read($, isBandHidden))) {
      stopSpin()
      return next(e)
    }
    // Another plugin's band beneath stays, under this one.
    const beneath = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const p = s.plan
    const [full, empty] = barCells(p.done, p.total)
    const phase = p.next?.phase ?? p.openPhases[0] ?? null
    const phaseAt = phase ? p.phases.indexOf(phase) : -1
    const flags: { key: string; tone: string; text: string }[] = []
    if (p.blocked.length) flags.push({ key: 'blocked', tone: TONE.red, text: `${p.blocked.length} blocked` })
    if (p.deferred.length) flags.push({ key: 'deferred', tone: TONE.yellow, text: `${p.deferred.length} deferred` })
    if (s.inFlight.length > 1) flags.push({ key: 'inflight', tone: TONE.blue, text: `+${s.inFlight.length - 1} in flight` })
    const mark = e.props.isWorking ? spinFrame($) : '◆'
    if (!e.props.isWorking) stopSpin()

    const [left, right] = e.surface === 'terminal' ? CAPS.terminal : CAPS.other
    const chip = (key: string, bg: string, parts: JSX.Element[] | JSX.Element) => (
      <Box key={key} flexDirection="row">
        {isRound && <Text color={bg}>{left}</Text>}
        <Box flexDirection="row" gap={1} paddingX={isRound ? 0 : 1} backgroundColor={bg}>
          {parts}
        </Box>
        {isRound && <Text color={bg}>{right}</Text>}
      </Box>
    )
    const button = (key: 'board' | 'hide', label: string, hotkey: string | undefined, onPress: () => unknown) => {
      if (e.surface !== 'terminal') return <Button key={key} label={label} hotkey={hotkey} onPress={onPress} />
      const bg = key === 'board' ? TONE.blue : TONE.grey
      const text = hotkey ? `${hotkey} ${label}` : label
      return (
        <Button key={key} label={label} hotkey={hotkey} plain onPress={onPress}>
          {isRound ? <Text color={bg}>{left}</Text> : ''}
          <Text color={INK} backgroundColor={bg}>{isRound ? text : ` ${text} `}</Text>
          {isRound ? <Text color={bg}>{right}</Text> : ''}
        </Button>
      )
    }

    // No width on the outer box: the engine refuses its own drawing (beneath)
    // under a Box with a width, and would drop the whole band.
    return (
      <Box flexDirection="column">
        <Box flexDirection="column" width={e.props.bodyColumns}>
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {chip('track', TONE.purple, [
              <Text key="mark" color={e.props.isWorking ? LEVEL.ok : ACCENT} backgroundColor={TONE.purple}>{mark}</Text>,
              <Text key="id" color={INK} backgroundColor={TONE.purple} bold>{s.trackId}</Text>,
            ])}
            {chip('progress', TONE.grey, [
              <Text key="bar" color={LEVEL.ok} backgroundColor={TONE.grey}>
                {full}
                <Text color={TRACK}>{empty}</Text>
              </Text>,
              <Text key="count" color={INK} backgroundColor={TONE.grey} bold>{`${p.done}/${p.total}`}</Text>,
              ...(phaseAt >= 0
                ? [<Text key="phase" color={INK} backgroundColor={TONE.grey} dimColor>{`│ phase ${phaseAt + 1}/${p.phases.length}`}</Text>]
                : []),
            ])}
            {flags.map(f => chip(f.key, f.tone, <Text color={INK} backgroundColor={f.tone}>{f.text}</Text>))}
            <Box flexGrow={1} />
            {button('board', 'Board', 'b', () => openBoard($))}
            {button('hide', 'Hide', undefined, async () => {
              await update($, isBandHidden, () => true)
              await syncStatus($)
            })}
          </Box>
          {p.next ? (
            <Box flexDirection="row" gap={1}>
              <Text dimColor>next</Text>
              <Text bold color={ACCENT}>{p.next.id}</Text>
              <Text wrap="truncate-end">{p.next.content}</Text>
            </Box>
          ) : (
            <Text dimColor wrap="truncate-end">{p.blockedReason ?? 'all todos done; run review'}</Text>
          )}
        </Box>
        {beneath}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, snapshot)
    if (!s) {
      return <Text dimColor>No conductor/ here. Run /conductor:conductor-setup to start.</Text>
    }
    const p = s.plan
    const room = Math.max(3, Math.floor(((e.viewport?.rows ?? 30) - 16) / 3))
    const header = (kind: keyof typeof HEAD, title: string) => (
      <Text bold color={HEAD[kind].color}>
        {HEAD[kind].icon} {title}
      </Text>
    )
    const bar = (done: number, total: number) => {
      const [full, empty] = barCells(done, total)
      return (
        <Text>
          <Text color={LEVEL.ok}>{full}</Text>
          <Text color={TRACK}>{empty}</Text>
        </Text>
      )
    }
    const row = (text: string, dim = false) => (
      <Text dimColor={dim} wrap="truncate-end">
        {'  '}
        {text}
      </Text>
    )
    const fill = (cmd: string) => () => $.prompt.fill({ text: cmd })

    return (
      <Box flexDirection="column" gap={1} width={e.props.bodyColumns}>
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1}>
            <Text bold color={ACCENT}>{s.trackId ?? 'No track'}</Text>
            {s.trackId && (
              <Text color={s.isInProgress ? LEVEL.ok : TRACK}>{s.isInProgress ? '● in progress' : '○ next up'}</Text>
            )}
          </Box>
          {s.description && <Text wrap="wrap">{s.description}</Text>}
          {p && (
            <Box flexDirection="row" gap={1}>
              {bar(p.done, p.total)}
              <Text bold>{`${p.done}/${p.total}`}</Text>
              <Text dimColor>
                todos{p.reviewRounds ? ` · review round ${p.reviewRounds}/2` : ''}
              </Text>
            </Box>
          )}
        </Box>

        {p && (
          <Box flexDirection="column">
            {header('next', 'Next')}
            {row(p.next ? `${p.next.id}: ${p.next.content}` : (p.blockedReason ?? 'nothing ready'))}
            {p.parallelBatch.length > 0 && row(`parallel batch: ${p.parallelBatch.join(', ')}`, true)}
          </Box>
        )}

        {p && p.phaseProgress.some(x => x.total > 0) && (
          <Box flexDirection="column">
            {header('phases', 'Phases')}
            {p.phaseProgress
              .filter(x => x.total > 0)
              .map(x => (
                <Box key={`phase-${x.phase}`} flexDirection="row" gap={1}>
                  <Text wrap="truncate-end">{'  '}{x.phase}</Text>
                  {bar(x.done, x.total)}
                  <Text dimColor={x.done === x.total}>
                    {x.done}/{x.total}
                    {x.done === x.total ? ' ✓' : ''}
                  </Text>
                </Box>
              ))}
          </Box>
        )}

        {p && p.waiting.length > 0 && (
          <Box flexDirection="column">
            {header('waiting', `Waiting (${p.waiting.length})`)}
            {p.waiting.slice(0, room).map(t => row(`${t.id} ← ${t.blockedBy.join(', ')}`, true))}
          </Box>
        )}

        {p && (p.blocked.length > 0 || p.deferred.length > 0) && (
          <Box flexDirection="column">
            {header('person', 'Needs a person')}
            {p.blocked.slice(0, room).map(t => row(`blocked ${t.id}${t.on ? `: ${t.on}` : ''}`))}
            {p.deferred.slice(0, room).map(t => row(`deferred check ${t.id}${t.phase ? ` (phase ${t.phase})` : ''}`))}
          </Box>
        )}

        {s.others.length > 0 && (
          <Box flexDirection="column">
            {header('others', `Also in progress (${s.others.length})`)}
            {s.others.slice(0, room).map(t => (
              <Box key={t.trackId} flexDirection="column">
                <Box flexDirection="row" gap={1}>
                  <Text color={ACCENT} wrap="truncate-end">
                    {'  '}
                    {t.trackId}
                  </Text>
                  {t.total > 0 && bar(t.done, t.total)}
                  {t.total > 0 && <Text dimColor>{`${t.done}/${t.total}`}</Text>}
                  <Box flexGrow={1} />
                  <Button
                    key={`implement-${t.trackId}`}
                    label="Implement"
                    onPress={fill(`/conductor:conductor-implement ${t.trackId}`)}
                  />
                </Box>
                {row(t.next ? `  next: ${t.next.content}` : '  nothing ready', true)}
              </Box>
            ))}
          </Box>
        )}

        <Box flexDirection="column">
          {header('tracks', 'Tracks')}
          {row(`eligible: ${s.eligible.join(', ') || 'none'}`)}
          {s.blockedTracks.slice(0, room).map(t => row(`blocked ${t.id} ← ${t.missing.join(', ')}`, true))}
          {s.archivable.length > 0 && row(`archivable: ${s.archivable.join(', ')}`, true)}
        </Box>

        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {s.trackId && (
            <Button
              key="implement"
              label="Implement"
              hotkey="i"
              variant="primary"
              onPress={fill(`/conductor:conductor-implement ${s.trackId}`)}
            />
          )}
          {s.isInProgress && p && !p.next && (
            <Button key="review" label="Review" hotkey="v" onPress={fill(`/conductor:conductor-review ${s.trackId}`)} />
          )}
          {s.archivable.length > 0 && (
            <Button key="archive" label="Archive" hotkey="a" onPress={fill('/conductor:conductor-archive')} />
          )}
          <Button key="status" label="Status" hotkey="s" onPress={fill('/conductor:conductor-status')} />
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => refresh($, true)} />
          <Button key="close" label="Close" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
