import { describe, expect, test } from 'claude-code/testing'

import { COLORS, colorFor, namingText, toSlug } from '../hooks/slug'

const ok = { isAnswered: true, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }
const DONE = { turnId: 't1', answer: 'ok', durationMs: 1, reason: 'answer', isAborted: false }

// Records the commands the feature runs and answers the model with `reply`.
const msg = (role: 'user' | 'assistant', text: string) => ({ role, text, toolUses: [] })
const TOPIC = [msg('user', 'fix IS NULL in protodb filters'), msg('assistant', 'On it.')]

function stubEngine(
  on: any,
  reply: string | null,
  transcript: object[] = TOPIC,
): { commands: string[]; prompts: string[] } {
  const seen = { commands: [] as string[], prompts: [] as string[] }
  on('session.messages', () => ({ value: transcript }))
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

describe('naming text', () => {
  test('uses the person\'s first prompts and the latest, without commands or image placeholders', () => {
    const text = namingText([
      msg('user', 'fix IS NULL in protodb filters'),
      msg('assistant', 'ok'),
      msg('user', '<command-name>/rename</command-name>'),
      msg('user', '[Image #4]'),
      msg('user', 'also nested transactions [Image #5]'),
      msg('user', 'and memadapter ordering'),
      msg('user', 'push and update'),
    ])
    expect(text).toContain('fix IS NULL in protodb filters')
    expect(text).toContain('also nested transactions')
    expect(text).toContain('push and update')
    expect(text).not.toContain('[Image')
    expect(text).not.toContain('command-name')
    expect(text).not.toContain('ok')
  })

  test('too little text: nothing to name from', () => {
    expect(namingText([msg('user', '[Image #4]'), msg('user', 'hi')])).toBeNull()
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

  test('names from the transcript, not from an image-only prompt seen mid-session', async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes', [...TOPIC, msg('user', '[Image #4]')])
    await $.classic.UserPromptSubmit({ prompt: '[Image #4]', source: 'user' } as never)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.prompts[0]).toContain('fix IS NULL in protodb filters')
    expect(seen.prompts[0]).not.toContain('[Image')
  })

  test('waits for enough text, then names on a later turn', async ($, on) => {
    const transcript: object[] = [msg('user', '[Image #4]')]
    const seen = stubEngine(on, 'protodb-null-fixes', transcript)
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.prompts.length).toBe(0)
    transcript.push(msg('user', 'fix IS NULL in protodb filters'))
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.commands[0]).toBe('/rename protodb-null-fixes')
  })
})
