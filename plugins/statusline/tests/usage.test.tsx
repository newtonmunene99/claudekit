import { describe, expect, test } from 'claude-code/testing'
import type { Plugin } from 'claude-code/testing'

export const BAND = {
  plugin: 'statusline',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 } as never,
} as const

// The engine's own drawing beneath every plugin: an empty box.
export function engineDraws(on: any): void {
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

// The test runtime has timers; the hooks environment's types do not declare them.
declare const setTimeout: (fn: () => void, ms: number) => unknown

const HOUR = 3_600_000

// `on` is the test body's registrar; typed loosely so stubs stay short.
export function stubUsage(on: any, over: object = {}): void {
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 50_000, window: 200_000, percent: 25 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 25, resetsAt: new Date(Date.now() + 3 * HOUR + 120_000).toISOString() },
        { kind: 'seven_day', percentUsed: 27, resetsAt: new Date(Date.now() + 5 * 24 * HOUR).toISOString() },
      ],
      cost: { usd: 4.71 },
      ...over,
    },
  }))
}

describe('band', () => {
  test('draws the limit, context and cost pills on both surfaces', async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BAND, surface })
      expect(await ui.find({ type: 'Text', text: /^5h$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^7d$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^ctx$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^│ ↻ 3h \d+m$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^\$ 4\.71$/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('passes when nothing is measured yet', async ($, on) => {
    stubUsage(on, { context: { window: 200_000 }, rateLimits: [], cost: undefined })
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect((await ui.findAll({ type: 'Text' })).length).toBe(0)
    await ui.unmount()
  })

  test('keeps the cost pill at 40 columns', async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    const ui = await $.ui.mount({
      ...BAND,
      surface: 'terminal',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 40 } as never,
    })
    expect(await ui.find({ type: 'Text', text: /^\$ 4\.71$/ })).toBeDefined()
    await ui.unmount()
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

  test('stacks the band a plugin beneath draws', { plugins: [beneath] }, async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: /^5h$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'other band' })).toBeDefined()
    await ui.unmount()
  })

  test('yields to a survey', async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    const ui = await $.ui.mount({
      ...BAND,
      surface: 'terminal',
      props: { hasSurvey: true, isWorking: false, maxRows: 10, bodyColumns: 120 } as never,
    })
    expect((await ui.findAll({ type: 'Text' })).length).toBe(0)
    await ui.unmount()
  })

  test('adds every model request to the token pills', async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    on('turn.step', async function* ($: unknown, e: { turnId: string; index: number }) {
      return {
        turnId: e.turnId,
        index: e.index,
        answer: '',
        toolUses: [],
        stopReason: 'end_turn',
        usage: {
          model: 'claude-opus-5-5',
          input_tokens: 100_000,
          cache_creation_input_tokens: 7_150,
          output_tokens: 30_600,
          cache_read_input_tokens: 4_290_000,
        },
      } as never
    })
    for (let i = 0; i < 2; i++) {
      const step = { turnId: 't1', index: i, model: 'claude-opus-5-5', messageCount: 1 }
      for await (const _ of $.turn.step(step as never)) {
        // drain the stream
      }
    }
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: '↑ 214.3k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '↓ 61.2k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '≋ 8.58M' })).toBeDefined()
    await ui.unmount()
  })
})

const HINT = {
  plugin: 'statusline',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } as never,
} as const

// A repo at /Volumes/x/go-alis-build: branch null means not a git repo, ''
// means detached HEAD.
function stubGit(on: any, branch: string | null, porcelain: string, sha = 'abc1234'): void {
  on('session.start', ($: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: undefined }))
  on('session.root', () => ({ value: '/Volumes/x/go-alis-build' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.id', () => ({ value: '0087e2e3-f23a-4d0f-845c-4ac4f65d3981' }))
  on('process.run', ($: unknown, e: { argv: string[] }) => {
    const ok = (stdout: string) => ({
      value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    })
    if (branch === null) throw new Error('not a git repository')
    if (e.argv.includes('--is-inside-work-tree')) return ok('true\n')
    if (e.argv.includes('--show-current')) return ok(`${branch}\n`)
    if (e.argv.includes('--short')) return ok(`${sha}\n`)
    if (e.argv.includes('--porcelain')) return ok(porcelain)
    return ok('')
  })
}

// Draws the hint line as the engine would and keeps the tail it was handed.
function captureTail(on: any): { tail?: string } {
  const seen: { tail?: string } = {}
  on('ui.render', ($: any, e: any) => {
    if (e.component === 'PromptHint') seen.tail = e.props.tail
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return seen
}

describe('identity', () => {
  for (const [name, branch, porcelain, expected] of [
    ['adds folder, dirty branch and model to the hint line', 'main', ' M a.go\n', 'go-alis-build (main✗) · Opus 5.5 · 0087e2e3'],
    ['a clean branch has no mark', 'main', '', 'go-alis-build (main) · Opus 5.5 · 0087e2e3'],
    ['detached HEAD shows the short sha', '', '', 'go-alis-build (abc1234) · Opus 5.5 · 0087e2e3'],
    ['outside a git repo: folder and model only', null, '', 'go-alis-build · Opus 5.5 · 0087e2e3'],
  ] as const) {
    test(name, async ($, on) => {
      stubUsage(on)
      stubGit(on, branch, porcelain)
      const seen = captureTail(on)
      await $.session.start({ cwd: '/Volumes/x/go-alis-build' } as never)
      const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
      expect(seen.tail).toBe(expected)
      await ui.unmount()
    })
  }
})

// The session around identity, with git left to each test.
function stubSession(on: any): void {
  on('session.start', ($: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: undefined }))
  on('session.root', () => ({ value: '/Volumes/x/go-alis-build' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.id', () => ({ value: '0087e2e3-f23a-4d0f-845c-4ac4f65d3981' }))
}

describe('identity refresh', () => {
  test('a subagent turn runs no git', async ($, on) => {
    stubUsage(on)
    stubSession(on)
    const calls: (readonly string[])[] = []
    on('process.run', ($: unknown, e: { argv: readonly string[] }) => {
      calls.push(e.argv)
      return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })
    on('turn.complete', ($: unknown, e: { answer: string }) => ({ text: e.answer }))
    await $.turn.complete({ turnId: 't1', agentId: 'sub-1', answer: 'ok', durationMs: 1, reason: 'answer', isAborted: false } as never)
    expect(calls.length).toBe(0)
  })

  test('a slow git never holds up the turn', async ($, on) => {
    stubUsage(on)
    stubSession(on)
    on('process.run', () => new Promise(() => {}))
    on('turn.complete', ($: unknown, e: { answer: string }) => ({ text: e.answer }))
    const done = await Promise.race([
      $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 1, reason: 'answer', isAborted: false } as never).then(() => 'done'),
      new Promise(resolve => setTimeout(() => resolve('blocked'), 500)),
    ])
    expect(done).toBe('done')
  })
})

describe('band updates', () => {
  test('a new measurement redraws the limit', async ($, on) => {
    let percent = 25
    on('session.usage', () => ({
      value: {
        startedAt: 0,
        context: { window: 200_000 },
        rateLimits: [{ kind: 'five_hour', percentUsed: percent }],
      },
    }))
    engineDraws(on)
    on('session.measure', ($: unknown, e: any) => ({ changed: e.changed }))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: '25%' })).toBeDefined()
    percent = 61
    await $.session.measure({
      context: { window: 200_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 61 }],
      changed: ['rateLimits'],
    } as never)
    expect(await ui.find({ type: 'Text', text: '61%' })).toBeDefined()
    await ui.unmount()
  })
})

describe('session name', () => {
  test('shows the name a prompt carries, before the id', async ($, on) => {
    stubUsage(on)
    stubGit(on, 'main', '')
    const seen = captureTail(on)
    on('classic.UserPromptSubmit', () => ({}))
    await $.session.start({ cwd: '/Volumes/x/go-alis-build' } as never)
    await $.classic.UserPromptSubmit({ prompt: 'hi', session_title: 'protodb fixes' } as never)
    const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
    expect(seen.tail).toBe('go-alis-build (main) · Opus 5.5 · protodb fixes · 0087e2e3')
    await ui.unmount()
  })
})
