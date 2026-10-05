// Pure formatting for the usage band and identity line. No `$`, so tests feed
// it plain values.

import type { UsageTokens } from '../types'

export const ZERO_TOKENS: UsageTokens = { input: 0, output: 0, cacheRead: 0 }

export function shortNumber(n: number): string {
  if (n < 1_000) return String(Math.round(n))
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// When a limit resets, in local time: "19:20", or "Thu 19:00" with the day
// for the weekly one. Null when unknown or already past.
export function resetTime(resetsAt: string | undefined, now: number, isWithDay: boolean): string | null {
  if (!resetsAt) return null
  const at = new Date(resetsAt)
  if (!Number.isFinite(at.getTime()) || at.getTime() <= now) return null
  const hm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return isWithDay ? `${DAYS[at.getDay()]} ${hm}` : hm
}

export function barCells(percent: number, width = 8): string {
  const filled = Math.min(width, Math.max(0, Math.round((percent / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export function level(percent: number): 'ok' | 'warn' | 'high' {
  if (percent >= 90) return 'high'
  if (percent >= 70) return 'warn'
  return 'ok'
}

export function addUsage(
  t: UsageTokens,
  u: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  },
): UsageTokens {
  return {
    input: t.input + u.input_tokens + u.cache_creation_input_tokens,
    output: t.output + u.output_tokens,
    cacheRead: t.cacheRead + u.cache_read_input_tokens,
  }
}

// "claude-opus-5-5" -> "Opus 5.5"; anything else is returned as given.
export function modelName(id: string): string {
  const [, family, major, minor] = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id) ?? []
  if (!family || !major || !minor) return id
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`
}

// "<folder> (<branch>[✗]) · <model>[ · <title>] · <id8>": the session's name
// when it has one, and the id's first 8 characters, enough to find or resume it.
export function identityText(
  folder: string,
  branch: string | null,
  isDirty: boolean,
  model: string,
  title: string | null,
  sessionId: string,
): string {
  const where = branch ? `${folder} (${branch}${isDirty ? '✗' : ''})` : folder
  return [where, model, title, sessionId.slice(0, 8)].filter(Boolean).join(' · ')
}
