import { describe, expect, test } from 'claude-code/testing'

import {
  ZERO_TOKENS,
  addUsage,
  barSegments,
  resetTime,
  identityText,
  level,
  modelName,
  shortNumber,
} from '../hooks/format'
import { buildPills } from '../hooks/pills'
import type { PillPart } from '../hooks/pills'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const at = (ms: number) => new Date(NOW + ms).toISOString()
const H = 3_600_000
// Each part as one token: an icon by name, a bar by percent, text as itself.
const texts = (p?: { parts: PillPart[] }) =>
  p?.parts.map(x => (x.kind === 'icon' ? `<${x.icon}>` : x.kind === 'bar' ? `[${x.percent}]` : x.text))

describe('format', () => {
  test('shortens numbers', () => {
    expect(shortNumber(999)).toBe('999')
    expect(shortNumber(214_300)).toBe('214.3k')
    expect(shortNumber(61_200)).toBe('61.2k')
    expect(shortNumber(8_580_000)).toBe('8.58M')
  })

  test('shows when a limit resets, in local time', () => {
    const at5h = new Date(NOW + 3 * H + 20 * 60_000)
    const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    expect(resetTime(at5h.toISOString(), NOW, false)).toBe(hm(at5h))
    const at7d = new Date(NOW + 3 * 24 * H)
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at7d.getDay()]
    expect(resetTime(at7d.toISOString(), NOW, true)).toBe(`${day} ${hm(at7d)}`)
    expect(resetTime(at(-60_000), NOW, false)).toBeNull()
    expect(resetTime(undefined, NOW, true)).toBeNull()
  })

  test('fills an 8-cell bar and colours it by threshold', () => {
    // The marker takes one cell; it sits at the start at 0% and the end at 100%.
    expect(barSegments(0)).toEqual({ filled: 0, empty: 7 })
    expect(barSegments(25)).toEqual({ filled: 2, empty: 5 })
    expect(barSegments(100)).toEqual({ filled: 7, empty: 0 })
    expect(barSegments(140)).toEqual({ filled: 7, empty: 0 })
    expect(level(69)).toBe('ok')
    expect(level(70)).toBe('warn')
    expect(level(89)).toBe('warn')
    expect(level(90)).toBe('high')
  })

  test('adds a request to the totals', () => {
    const t = addUsage(ZERO_TOKENS, {
      input_tokens: 10,
      cache_creation_input_tokens: 5,
      output_tokens: 7,
      cache_read_input_tokens: 100,
    })
    expect(t).toEqual({ input: 15, output: 7, cacheRead: 100 })
  })

  test('names models and builds the identity line', () => {
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(modelName('Opus 5.5')).toBe('Opus 5.5')
    const id = '0087e2e3-f23a-4d0f-845c-4ac4f65d3981'
    expect(identityText('go-alis-build', 'main', true, 'Opus 5.5', null, id)).toBe(
      'go-alis-build (main✗) · Opus 5.5 · 0087e2e3',
    )
    expect(identityText('go-alis-build', null, false, 'Opus 5.5', null, id)).toBe('go-alis-build · Opus 5.5 · 0087e2e3')
    expect(identityText('go-alis-build', 'main', false, 'Opus 5.5', 'protodb fixes', id)).toBe(
      'go-alis-build (main) · Opus 5.5 · protodb fixes · 0087e2e3',
    )
  })
})

describe('pills', () => {
  const full = {
    context: { percent: 25 },
    rateLimits: [
      { kind: 'seven_day', percentUsed: 27, resetsAt: at(5 * 24 * H + 6 * H + 60_000) },
      { kind: 'five_hour', percentUsed: 25, resetsAt: at(3 * H + 57 * 60_000 + 5_000) },
    ],
    cost: { usd: 4.711 },
  }
  const tokens = { input: 214_300, output: 61_200, cacheRead: 8_580_000 }

  test('builds every pill in order', () => {
    const pills = buildPills(full, tokens, NOW)
    expect(pills.map(p => p.key)).toEqual(['5h', '7d', 'ctx', 'in', 'out', 'cache', 'cost'])
    expect(texts(pills[0])).toEqual([
      '<limit5h>', '5h', '[25]', '25%', '│', '<reset>', resetTime(full.rateLimits[1]?.resetsAt, NOW, false)])
    expect(texts(pills[1])).toEqual([
      '<limit7d>', '7d', '[27]', '27%', '│', '<reset>', resetTime(full.rateLimits[0]?.resetsAt, NOW, true)])
    expect(texts(pills[1])?.[6]).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d\d:\d\d$/)
    expect(texts(pills[0])?.[6]).toMatch(/^\d\d:\d\d$/)
    expect(texts(pills[2])).toEqual(['<context>', 'ctx', '[25]', '25%'])
    expect(texts(pills[3])).toEqual(['<input>', '214.3k'])
    expect(texts(pills[4])).toEqual(['<output>', '61.2k'])
    expect(texts(pills[5])).toEqual(['<cache>', '8.58M'])
    expect(texts(pills[6])).toEqual(['<cost>', '4.71'])
  })

  test('off a subscription: no 5h or 7d pill', () => {
    const pills = buildPills({ ...full, rateLimits: [] }, tokens, NOW)
    expect(pills.map(p => p.key)).toEqual(['ctx', 'in', 'out', 'cache', 'cost'])
  })

  test('a missing or past reset drops only the reset time', () => {
    const pills = buildPills(
      { ...full, rateLimits: [{ kind: 'five_hour', percentUsed: 91, resetsAt: at(-1) }] },
      tokens,
      NOW,
    )
    expect(texts(pills[0])).toEqual(['<limit5h>', '5h', '[91]', '91%'])
  })

  test('nothing measured yet: no pills', () => {
    expect(buildPills({ context: {}, rateLimits: [] }, ZERO_TOKENS, NOW)).toEqual([])
  })
})
