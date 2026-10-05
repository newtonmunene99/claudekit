// Usage band above the prompt and folder · branch · model under it. Engine
// figures are read live while drawing ($.session.usage() is free); events and
// a timer only ask for a redraw.

import { atom, read } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ZERO_TOKENS } from './format'
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

function redraw($: EngineInterface): void {
  $.ui.invalidate('ui.render')
}

export function registerUsage(on: On): void {
  // Countdowns move with the clock, not with events.
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    $.clock.every(30_000, () => redraw($))
    return started
  })

  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    redraw($)
    return measured
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
