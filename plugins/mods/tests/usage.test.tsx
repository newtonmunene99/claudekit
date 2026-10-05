import { describe, expect, test } from 'claude-code/testing'

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

describe('switch', () => {
  test('the usage feature draws when on', async ($, on) => {
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text' })).toBeDefined()
    await ui.unmount()
  })

  test('usage off registers no band', { options: { usage: false } }, async ($, on) => {
    engineDraws(on)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text' })).toBeUndefined()
    await ui.unmount()
  })
})
