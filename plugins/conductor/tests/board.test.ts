import { describe, expect, test } from 'claude-code/testing'

describe('board command', () => {
  test('answers /conductor-board', async ($, on) => {
    on('session.root', () => ({ value: '/repo' }))
    on('fs.exists', () => ({ value: false }))
    on('ui.status', () => ({ value: undefined }))
    on('ui.open', () => ({ value: { isPlaced: true } as never }))
    const ran = await $.command.run({ command: 'conductor-board' } as never)
    expect(ran.text).toBe('Conductor board opened.')
  })

  test('answers even when opening the pane fails', async ($, on) => {
    on('session.root', () => ({ value: '/repo' }))
    on('fs.exists', () => {
      throw new Error('no fs')
    })
    on('ui.status', () => ({ value: undefined }))
    on('ui.open', () => {
      throw new Error('no pane')
    })
    const ran = await $.command.run({ command: 'conductor-board' } as never)
    expect(ran.text).toContain("could not open")
  })

  test('the band Board button opens the pane', async ($, on) => {
    const opened: string[] = []
    on('session.root', () => ({ value: '/repo' }))
    on('fs.exists', () => ({ value: true }))
    on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
    on('process.run', ($, e) => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify(
          e.argv.includes('tracks')
            ? {
                tracks: [{ description: 'A', status: 'in_progress', track_id: 'a', plan: 'conductor/plans/a.plan.md' }],
                in_progress: ['a'], archivable: [], eligible: [], blocked: [], recommended: 'a', all_complete: false,
              }
            : {
                plan: 'conductor/plans/a.plan.md', name: 'A',
                counts: { pending: 1, in_progress: 0, completed: 1, deferred: 0, blocked: 0 }, total: 2,
                in_progress: [], deferred: [], blocked: [], next: null, ready: [], waiting: [],
                parallel_batch: [], review_rounds: 0, phases: [], blocked_reason: null,
              },
        ),
        stderr: '', isStdoutTruncated: false, isStderrTruncated: false,
      },
    }))
    on('ui.status', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    on('ui.open', ($, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } as never }
    })
    await $.command.run({ command: 'conductor-board' } as never)
    opened.length = 0

    const ui = await $.ui.mount({
      plugin: 'conductor',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 } as never,
    })
    await ui.press({ key: 'board' })
    expect(opened).toEqual(['conductor-board'])
    await ui.unmount()
  })
})
