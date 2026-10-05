// Conductor HUD: a status line, a band above the prompt, a /conductor-board
// pane, milestone toasts, an upgrade nudge, and a guard that keeps todo
// status changes on conductor_state.py. All data comes from that script, so
// the HUD never parses plans itself.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { changesStatus, denyReason, isPlanPath, rewritesConductorFile } from './guard'
import { hasBand, milestones, pickTrack, statusText, toSnapshot } from './snapshot'

type Json = Record<string, any>

const PANE = 'conductor-board'
const snapshot = atom({ plugin: 'conductor', key: 'snapshot' } as const, null)
const isBandHidden = atom({ plugin: 'conductor', key: 'isBandHidden' } as const, false)

const scriptPath = ($: EngineInterface) => `${$.plugin.root}/scripts/conductor_state.py`

// Module state resets on reload; session.start then fires again and refills it.
let lastKey = ''
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

// Re-runs the script only when tracks.md or the followed plan changed, so
// calling this after every edit costs two stats.
async function refresh($: EngineInterface, force = false): Promise<void> {
  const root = await $.session.root()
  const tracksFile = `${root}/conductor/context/tracks.md`
  const prev = await read($, snapshot)
  if (!(await $.fs.exists(tracksFile))) {
    if (prev !== null) await update($, snapshot, () => null)
    $.ui.status(undefined)
    return
  }
  const planFile = prev?.plan ? `${root}/${prev.plan.path}` : null
  const key = `${await mtime($, tracksFile)}:${planFile ? await mtime($, planFile) : 0}`
  if (!force && key === lastKey) return
  lastKey = key

  const tracks = await runScript($, ['tracks'])
  if (!tracks || tracks.error) return
  const track = pickTrack(tracks)
  const plan = track?.plan ? await runScript($, ['plan', track.plan]) : null
  const next = toSnapshot(tracks, plan)
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

export const register: Register = on => {
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
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const p = s.plan
    const filled = p.total ? Math.round((p.done / p.total) * 10) : 0
    const flags = [
      p.blocked.length ? `${p.blocked.length} blocked` : '',
      p.deferred.length ? `${p.deferred.length} deferred` : '',
    ].filter(Boolean)
    const nextLine = p.next
      ? `next: ${p.next.content}`
      : (p.blockedReason ?? 'all todos done; run review')

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        <Box flexDirection="row" gap={1}>
          <Text bold color="cyan">◆ {s.trackId}</Text>
          <Text>
            {'█'.repeat(filled)}
            {'░'.repeat(10 - filled)} {p.done}/{p.total}
          </Text>
          {flags.length > 0 && <Text color="yellow">{flags.join(' · ')}</Text>}
          <Box flexGrow={1} />
          <Button key="board" label="Board" hotkey="b" onPress={() => openBoard($)} />
          <Button key="hide" label="Hide" onPress={async () => {
              await update($, isBandHidden, () => true)
              await syncStatus($)
            }} />
        </Box>
        <Text dimColor wrap="truncate-end">{nextLine}</Text>
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
    const header = (title: string) => <Text bold>{title}</Text>
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
          <Text bold color="cyan">
            {s.trackId ?? 'No track'} {s.isInProgress ? '(in progress)' : s.trackId ? '(next up)' : ''}
          </Text>
          {s.description && <Text wrap="wrap">{s.description}</Text>}
          {p && (
            <Text>
              {p.done}/{p.total} todos · phases {p.phases.join(', ') || 'none'}
              {p.reviewRounds ? ` · review round ${p.reviewRounds}/2` : ''}
            </Text>
          )}
        </Box>

        {p && (
          <Box flexDirection="column">
            {header('Next')}
            {row(p.next ? `${p.next.id}: ${p.next.content}` : (p.blockedReason ?? 'nothing ready'))}
            {p.parallelBatch.length > 0 && row(`parallel batch: ${p.parallelBatch.join(', ')}`, true)}
          </Box>
        )}

        {p && p.waiting.length > 0 && (
          <Box flexDirection="column">
            {header(`Waiting (${p.waiting.length})`)}
            {p.waiting.slice(0, room).map(t => row(`${t.id} ← ${t.blockedBy.join(', ')}`, true))}
          </Box>
        )}

        {p && (p.blocked.length > 0 || p.deferred.length > 0) && (
          <Box flexDirection="column">
            {header('Needs a person')}
            {p.blocked.slice(0, room).map(t => row(`blocked ${t.id}${t.on ? `: ${t.on}` : ''}`))}
            {p.deferred.slice(0, room).map(t => row(`deferred check ${t.id}${t.phase ? ` (phase ${t.phase})` : ''}`))}
          </Box>
        )}

        <Box flexDirection="column">
          {header('Tracks')}
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
