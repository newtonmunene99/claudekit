import { describe, expect, test } from 'claude-code/testing'

import { COLORS, colorFor, toSlug } from '../hooks/slug'

const ok = { isAnswered: true, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }
const DONE = { turnId: 't1', answer: 'ok', durationMs: 1, reason: 'answer', isAborted: false }

// Records the commands the feature runs and answers the model with `reply`.
function stubEngine(on: any, reply: string | null): { commands: string[]; prompts: string[] } {
  const seen = { commands: [] as string[], prompts: [] as string[] }
  on('classic.UserPromptSubmit', () => ({}))
  on('turn.complete', ($: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('model.complete', ($: unknown, e: { prompt: string }) => {
    seen.prompts.push(e.prompt)
    return { value: reply === null ? { ...ok, isAnswered: false, reason: 'empty-reply' } : { ...ok, text: reply } }
  })
  on('command.run', ($: unknown, e: { command: string; args: string }) => {
    seen.commands.push(`/${e.command} ${e.args}`)
    return { text: '' }
  })
  return seen
}

// The test runtime has timers; the hooks environment's types do not declare them.
declare const setTimeout: (fn: () => void, ms: number) => unknown

// Lets the feature's background work finish.
async function settle($: unknown): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 30))
}

describe('slug', () => {
  test('cleans a model reply into a short kebab-case slug', () => {
    expect(toSlug('protodb-null-fixes')).toBe('protodb-null-fixes')
    expect(toSlug('  "Protodb NULL fixes."\n')).toBe('protodb-null-fixes')
    expect(toSlug('a-very-long-name-with-far-too-many-words')).toBe('a-very-long-name')
    expect(toSlug('!!!')).toBeNull()
  })

  test('picks the same colour for the same slug', () => {
    expect(COLORS).toContain(colorFor('protodb-null-fixes'))
    expect(colorFor('protodb-null-fixes')).toBe(colorFor('protodb-null-fixes'))
  })
})

describe('autoname', () => {
  test('names and colours an unnamed session after its first turn', async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes')
    await $.classic.UserPromptSubmit({ prompt: 'fix IS NULL in protodb filters', source: 'user' } as never)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.prompts[0]).toContain('fix IS NULL in protodb filters')
    expect(seen.commands).toEqual(['/rename protodb-null-fixes', `/color ${colorFor('protodb-null-fixes')}`])
  })

  test('leaves a named session alone', async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes')
    await $.classic.UserPromptSubmit({ prompt: 'hi', source: 'user', session_title: 'mine' } as never)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.commands).toEqual([])
  })

  test('tries once per session', async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes')
    await $.classic.UserPromptSubmit({ prompt: 'hi', source: 'user' } as never)
    await $.turn.complete(DONE as never)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.prompts.length).toBe(1)
  })

  test('ignores subagent turns and an empty reply', async ($, on) => {
    const seen = stubEngine(on, null)
    await $.classic.UserPromptSubmit({ prompt: 'hi', source: 'user' } as never)
    await $.turn.complete({ ...DONE, agentId: 'sub' } as never)
    await settle($)
    expect(seen.prompts.length).toBe(0)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.commands).toEqual([])
  })

  test('colour can be turned off', { options: { color: false } }, async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes')
    await $.classic.UserPromptSubmit({ prompt: 'hi', source: 'user' } as never)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.commands).toEqual(['/rename protodb-null-fixes'])
  })
})
