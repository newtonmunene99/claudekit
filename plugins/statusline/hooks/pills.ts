// The band's content as plain data: which pills, in which order, with which
// parts. The render hook only maps these to elements; icons are named here and
// drawn per surface there.

import type { UsageTokens } from '../types'
import { level, resetTime, shortNumber } from './format'

export type Tone = 'green' | 'purple' | 'grey' | 'red' | 'blue' | 'yellow'
export type Icon = 'limit5h' | 'limit7d' | 'context' | 'reset' | 'input' | 'output' | 'cache' | 'cost'
export type PillPart =
  | { kind: 'text'; text: string; isBold?: boolean; isDim?: boolean }
  | { kind: 'icon'; icon: Icon }
  | { kind: 'bar'; percent: number; level: 'ok' | 'warn' | 'high' }
export type PillSpec = { key: string; tone: Tone; parts: PillPart[] }

// The slice of $.session.usage() the band reads.
export type UsageFigures = {
  context: { percent?: number }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

const icon = (name: Icon): PillPart => ({ kind: 'icon', icon: name })
const text = (value: string, style: { isBold?: boolean; isDim?: boolean } = {}): PillPart => ({
  kind: 'text',
  text: value,
  ...style,
})

function meter(key: string, mark: Icon, label: string, tone: Tone, percent: number, reset: string | null): PillSpec {
  const parts: PillPart[] = [
    icon(mark),
    text(label, { isDim: true }),
    { kind: 'bar', percent, level: level(percent) },
    text(`${Math.round(percent)}%`, { isBold: true }),
  ]
  if (reset) parts.push(text('│', { isDim: true }), icon('reset'), text(reset, { isDim: true }))
  return { key, tone, parts }
}

export function buildPills(usage: UsageFigures, tokens: UsageTokens, now: number): PillSpec[] {
  const pills: PillSpec[] = []
  const limit = (kind: string) => usage.rateLimits.find(r => r.kind === kind)
  const five = limit('five_hour')
  const week = limit('seven_day')
  if (five) pills.push(meter('5h', 'limit5h', '5h', 'green', five.percentUsed, resetTime(five.resetsAt, now, false)))
  if (week) pills.push(meter('7d', 'limit7d', '7d', 'purple', week.percentUsed, resetTime(week.resetsAt, now, true)))
  if (usage.context.percent !== undefined) {
    pills.push(meter('ctx', 'context', 'ctx', 'grey', usage.context.percent, null))
  }
  if (tokens.input + tokens.output + tokens.cacheRead > 0) {
    pills.push({ key: 'in', tone: 'red', parts: [icon('input'), text(shortNumber(tokens.input))] })
    pills.push({ key: 'out', tone: 'green', parts: [icon('output'), text(shortNumber(tokens.output))] })
    pills.push({ key: 'cache', tone: 'blue', parts: [icon('cache'), text(shortNumber(tokens.cacheRead))] })
  }
  if (usage.cost) pills.push({ key: 'cost', tone: 'yellow', parts: [icon('cost'), text(usage.cost.usd.toFixed(2))] })
  return pills
}
