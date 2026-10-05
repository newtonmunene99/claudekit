import { describe, expect, test } from 'claude-code/testing'

import { changesStatus, isPlanPath, rewritesConductorFile } from '../hooks/guard'
import { milestones, statusText, toSnapshot } from '../hooks/snapshot'

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

describe('snapshot', () => {
  test('follows the in-progress track and counts deferred as done', () => {
    const s = toSnapshot(TRACKS, planJson())
    expect(s.trackId).toBe('track-a')
    expect(s.plan?.done).toBe(7)
    expect(s.plan?.openPhases).toEqual(['P2'])
    expect(statusText(s)).toBe('conductor: track-a 7/12')
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
    expect(status).toBe('conductor: track-a 7/12')

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
    expect(toasts).toEqual([])
  })
})
