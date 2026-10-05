// Usage band above the prompt and folder · branch · model under it.

import type { Register } from 'claude-code'

export type On = Parameters<Register>[0]

export function registerUsage(on: On): void {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Text } = $.ui.resolve(e)
    return <Text>usage</Text>
  })
}
