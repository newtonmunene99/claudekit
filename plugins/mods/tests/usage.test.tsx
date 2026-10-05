import { describe, expect, test } from 'claude-code/testing'
import type { Plugin } from 'claude-code/testing'

export const BAND = {
  plugin: 'mods',
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

describe('switch', () => {
  test('the usage feature draws when on', async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text' })).toBeDefined()
    await ui.unmount()
  })

  test('usage off registers no band', { options: { usage: false } }, async ($, on) => {
    stubUsage(on)
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text' })).toBeUndefined()
    await ui.unmount()
  })
})

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
})
