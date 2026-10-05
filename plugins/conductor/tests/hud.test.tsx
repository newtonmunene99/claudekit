import { describe, expect, test } from 'claude-code/testing'
import type { Plugin } from 'claude-code/testing'

import { changesStatus, isPlanPath, rewritesConductorFile } from '../hooks/guard'
import { milestones, pickTrack, statusText, toSnapshot } from '../hooks/snapshot'

const ROOT = '/repo'
const PLAN = 'conductor/plans/track-a.plan.md'

const TRACKS = {
  tracks: [
    { description: 'Auth flow', status: 'in_progress', track_id: 'track-a', plan: PLAN },
    { description: 'Billing', status: 'pending', track_id: 'track-b', plan: null },
  ],
  in_progress: ['track-a'],
  archivable: [],
  eligible: [{ track_id: 'track-a' }, { track_id: 'track-b' }],
  blocked: [],
  recommended: 'track-a',
  all_complete: false,
}

const planJson = (over: Record<string, unknown> = {}) => ({
  plan: PLAN,
  name: 'Auth flow',
  counts: { pending: 4, in_progress: 1, completed: 6, deferred: 1, blocked: 0 },
  total: 12,
  in_progress: ['token-expiry'],
  deferred: [{ id: 'verify-p1', phase: 'P1' }],
  blocked: [],
  next: { id: 'token-expiry', content: 'Reject expired refresh tokens', phase: 'P2' },
  ready: [{ id: 'token-expiry', content: 'Reject expired refresh tokens', phase: 'P2' }],
  waiting: [{ id: 'verify-p2', content: 'Hand check', phase: 'P2', blocked_by: ['token-expiry'] }],
  parallel_batch: [],
  review_rounds: 0,
  phases: ['P1', 'P2'],
  blocked_reason: null,
  ...over,
})

const PLAN_B = 'conductor/plans/track-b.plan.md'

// Two tracks in progress: track-a first in tracks.md, track-b started later.
const TWO_IN_FLIGHT = {
  ...TRACKS,
  tracks: [
    TRACKS.tracks[0],
    { description: 'Billing', status: 'in_progress', track_id: 'track-b', plan: PLAN_B },
  ],
  in_progress: ['track-a', 'track-b'],
}


// The engine's own drawing beneath every plugin: an empty box.
function engineDraws(on: any): void {
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

describe('snapshot', () => {
  test('follows the in-progress track whose plan changed last', () => {
    expect(pickTrack(TWO_IN_FLIGHT, { [PLAN]: 1, [PLAN_B]: 2 })?.track_id).toBe('track-b')
    expect(pickTrack(TWO_IN_FLIGHT, { [PLAN]: 2, [PLAN_B]: 1 })?.track_id).toBe('track-a')
    // No mtimes, e.g. both plans missing: tracks.md order.
    expect(pickTrack(TWO_IN_FLIGHT)?.track_id).toBe('track-a')
    const s = toSnapshot(TWO_IN_FLIGHT, planJson({ plan: PLAN_B }), { [PLAN]: 1, [PLAN_B]: 2 })
    expect(s.trackId).toBe('track-b')
    expect(s.inFlight).toEqual(['track-a', 'track-b'])
    expect(s.others).toEqual([{ trackId: 'track-a', description: 'Auth flow', done: 0, total: 0, next: null }])
    expect(statusText(s)).toBe('track-b 7/12 (+1 in flight)')
  })

  test('follows the in-progress track and counts deferred as done', () => {
    const s = toSnapshot(TRACKS, planJson())
    expect(s.trackId).toBe('track-a')
    expect(s.plan?.done).toBe(7)
    expect(s.plan?.openPhases).toEqual(['P2'])
    expect(statusText(s)).toBe('track-a 7/12')
  })

  test('announces a finished phase, a new blocker and the review limit', () => {
    const before = toSnapshot(TRACKS, planJson({
      waiting: [{ id: 'verify-p1', content: 'x', phase: 'P1', blocked_by: [] }, ...planJson().waiting],
    }))
    const after = toSnapshot(TRACKS, planJson({
      blocked: [{ id: 'webhook', on: 'upstream PR' }],
      review_rounds: 2,
    }))
    // A phase whose last open todo is blocked is not done.
    const stillBlocked = toSnapshot(TRACKS, planJson({ blocked: [{ id: 'verify-p1', on: 'QA', phase: 'P1' }] }))
    expect(milestones(before, stillBlocked)).not.toContain('Conductor: phase P1 done')
    expect(milestones(before, after)).toEqual([
      'Conductor: phase P1 done',
      'Conductor: webhook blocked on upstream PR',
      'Conductor: review hit its 2-round limit; the next round escalates',
    ])
  })

  test('announces a completed track once it is archivable', () => {
    const before = toSnapshot(TRACKS, planJson())
    const after = toSnapshot(
      { ...TRACKS, tracks: [{ ...TRACKS.tracks[0], status: 'completed' }], in_progress: [], archivable: ['track-a'] },
      null,
    )
    expect(milestones(before, after)).toContain('Conductor: track track-a complete')
  })
})

describe('guard', () => {
  test('flags a status flip but not new pending todos or other fields', () => {
    expect(changesStatus('    status: pending', '    status: completed')).toBe(true)
    expect(changesStatus('status: pending\n', 'status: pending\n  - id: b\n    status: pending\n')).toBe(false)
    expect(changesStatus('review_rounds: 0', 'review_rounds: 1')).toBe(false)
  })

  test('recognises plans and in-place shell rewrites', () => {
    expect(isPlanPath(`${ROOT}/${PLAN}`)).toBe(true)
    expect(isPlanPath(`${ROOT}/conductor/specs/track-a/spec.md`)).toBe(false)
    expect(rewritesConductorFile(`sed -i '' 's/pending/completed/' ${PLAN}`)).toBe(true)
    expect(rewritesConductorFile(`cat > conductor/context/tracks.md <<EOF`)).toBe(true)
    expect(rewritesConductorFile(`python3 x/conductor_state.py set-todo ${PLAN} a completed`)).toBe(false)
    expect(rewritesConductorFile(`grep status ${PLAN}`)).toBe(false)
  })
})

// Stubs the host so the plugin's own hooks run end to end: the script's JSON,
// a project root with conductor/, and the tool beneath the guard.
describe('hud', () => {
  test('refreshes after a tool call, denies a hand status edit, draws the band', async ($, on) => {
    engineDraws(on)
    const toasts: string[] = []
    let status: string | undefined
    on('session.root', () => ({ value: ROOT }))
    on('fs.exists', () => ({ value: true }))
    on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
    on('process.run', ($, e) => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify(e.argv.includes('tracks') ? TRACKS : planJson()),
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }))
    on('ui.status', ($, e) => {
      status = e.text
      return { value: undefined }
    })
    on('ui.toast', ($, e) => {
      toasts.push(e.text)
      return { value: undefined }
    })
    on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } as never }))

    await $.tool.call({ tool: 'Bash', tool_use_id: 't1', command: 'git status' } as never)
    // The band shows the track, so the status line stays empty.
    expect(status).toBeUndefined()

    const denied = await $.tool.call({
      tool: 'Edit',
      tool_use_id: 't2',
      file_path: `${ROOT}/${PLAN}`,
      old_string: '    status: pending',
      new_string: '    status: completed',
    } as never)
    expect(denied.deny).toContain('set-todo')

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'conductor',
        surface,
        component: 'AbovePrompt',
        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
      })
      expect(await ui.find({ type: 'Text', text: /track-a/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /next: Reject expired/ })).toBeDefined()
      await ui.unmount()
    }
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'conductor',
        surface,
        component: 'Pane',
        requestId: 'conductor-board',
        props: { title: 'Conductor', isFocused: false, bodyColumns: 60, placement: 'dock' } as never,
      })
      expect(await ui.find({ key: 'implement' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /verify-p2 ← token-expiry/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /deferred check verify-p1/ })).toBeDefined()
      await ui.unmount()
    }
    const band = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
    })
    await band.press({ key: 'hide' })
    expect(status).toBe('track-a 7/12')
    await band.unmount()
    expect(toasts).toEqual([])
  })

  test('moves to the newer track when a second one starts', async ($, on) => {
    engineDraws(on)
    on('session.root', () => ({ value: ROOT }))
    on('fs.exists', () => ({ value: true }))
    on('fs.stat', ($, e) => ({
      value: { kind: 'file', size: 1, mtimeMs: e.path.endsWith(PLAN_B) ? 2 : 1, isLink: false },
    }))
    on('process.run', ($, e) => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify(
          e.argv.includes('tracks') ? TWO_IN_FLIGHT : planJson({ plan: e.argv.at(-1), name: 'Billing' }),
        ),
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }))
    on('ui.status', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    on('ui.open', () => ({ value: { isPlaced: true } as never }))

    await $.command.run({ command: 'conductor-board' } as never)
    const band = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
    })
    expect(await band.find({ type: 'Text', text: /track-b/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /\+1 in flight/ })).toBeDefined()
    await band.unmount()

    const board = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'conductor-board',
      props: { title: 'Conductor', isFocused: false, bodyColumns: 80, placement: 'dock' } as never,
    })
    expect(await board.find({ type: 'Text', text: /Also in progress \(1\)/ })).toBeDefined()
    expect(await board.find({ type: 'Text', text: /track-a 7\/12/ })).toBeDefined()
    expect(await board.find({ key: 'implement-track-a' })).toBeDefined()
    await board.unmount()
  })

  const beneath: Plugin = {
    name: 'beneath',
    tier: 'append',
    register(on) {
      on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
        const { Text } = $.ui.resolve(e)
        return <Text>other band</Text>
      })
    },
  }

  // The real engine hands back its own drawing, which it refuses under a Box
  // with a width: the band must still show over it.
  test('draws over the engine band', async ($, on) => {
    on('session.root', () => ({ value: ROOT }))
    on('fs.exists', () => ({ value: true }))
    on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
    on('process.run', ($, e) => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify(e.argv.includes('tracks') ? TRACKS : planJson()),
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }))
    on('ui.status', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    on('ui.open', () => ({ value: { isPlaced: true } as never }))
    on('ui.render', () => ({ type: 'engine', ref: 0 }) as never)
    await $.command.run({ command: 'conductor-board' } as never)
    const band = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
    })
    expect(await band.find({ type: 'Text', text: /track-a/ })).toBeDefined()
    await band.unmount()
  })

  test('keeps the band a plugin beneath draws', { plugins: [beneath] }, async ($, on) => {
    engineDraws(on)
    on('session.root', () => ({ value: ROOT }))
    on('fs.exists', () => ({ value: true }))
    on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
    on('process.run', ($, e) => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify(e.argv.includes('tracks') ? TRACKS : planJson()),
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }))
    on('ui.status', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    on('ui.open', () => ({ value: { isPlaced: true } as never }))
    await $.command.run({ command: 'conductor-board' } as never)
    const band = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
    })
    expect(await band.find({ type: 'Text', text: /track-a/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: 'other band' })).toBeDefined()
    await band.unmount()
  })
})
