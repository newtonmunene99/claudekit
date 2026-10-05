// The band's content as plain data: which pills, in which order, with which
// text. The render hook only maps these to elements.

import type { UsageTokens } from '../types'
import { barCells, countdown, level, shortNumber } from './format'

export type Tone = 'green' | 'purple' | 'grey' | 'red' | 'blue' | 'yellow'
export type PillPart = { text: string; level?: 'ok' | 'warn' | 'high'; isBold?: boolean; isDim?: boolean }
export type PillSpec = { key: string; tone: Tone; parts: PillPart[] }

// The slice of $.session.usage() the band reads.
export type UsageFigures = {
  context: { percent?: number }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

function meter(key: string, label: string, tone: Tone, percent: number, reset: string | null): PillSpec {
  const parts: PillPart[] = [
    { text: label, isDim: true },
    { text: barCells(percent), level: level(percent) },
    { text: `${Math.round(percent)}%`, isBold: true },
  ]
  if (reset) parts.push({ text: `│ ↻ ${reset}`, isDim: true })
  return { key, tone, parts }
}

export function buildPills(usage: UsageFigures, tokens: UsageTokens, now: number): PillSpec[] {
  const pills: PillSpec[] = []
  const limit = (kind: string) => usage.rateLimits.find(r => r.kind === kind)
  const five = limit('five_hour')
  const week = limit('seven_day')
  if (five) pills.push(meter('5h', '5h', 'green', five.percentUsed, countdown(five.resetsAt, now)))
  if (week) pills.push(meter('7d', '7d', 'purple', week.percentUsed, countdown(week.resetsAt, now)))
  if (usage.context.percent !== undefined) {
    pills.push(meter('ctx', 'ctx', 'grey', usage.context.percent, null))
  }
  if (tokens.input + tokens.output + tokens.cacheRead > 0) {
    pills.push({ key: 'in', tone: 'red', parts: [{ text: `↑ ${shortNumber(tokens.input)}` }] })
    pills.push({ key: 'out', tone: 'green', parts: [{ text: `↓ ${shortNumber(tokens.output)}` }] })
    pills.push({ key: 'cache', tone: 'blue', parts: [{ text: `≋ ${shortNumber(tokens.cacheRead)}` }] })
  }
  if (usage.cost) pills.push({ key: 'cost', tone: 'yellow', parts: [{ text: `$ ${usage.cost.usd.toFixed(2)}` }] })
  return pills
}
