import { describe, expect, test } from 'claude-code/testing'

import { COLORS, colorFor, describeSession, toSlug } from '../hooks/slug'

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
  on('session.cwd', () => ({ value: '/work/alis/build/bl/blocks/v1' }))
  on('clock.after', () => ({ value: undefined }))
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
    expect(toSlug('blocks-merge-git-rename-fix')).toBe('blocks-merge-git-rename')
    expect(toSlug('!!!')).toBeNull()
  })

  test('refuses prose, so a sentence never becomes a name', () => {
    expect(toSlug('I can see there are two things going on here')).toBeNull()
    expect(toSlug('Sure. protodb-null-fixes and more')).toBeNull()
    expect(toSlug('Here is a name:\nprotodb-null-fixes')).toBe('protodb-null-fixes')
    expect(toSlug('protodb-null-fixes\n\nThis name')).toBe('protodb-null-fixes')
  })

  test('picks the same colour for the same slug', () => {
    expect(COLORS).toContain(colorFor('protodb-null-fixes'))
    expect(colorFor('protodb-null-fixes')).toBe(colorFor('protodb-null-fixes'))
  })
})

const CWD = '/work/alis/build/bl/blocks/v1'

describe('session description', () => {
  test('uses the person\'s first prompts and the latest, without commands or image placeholders', () => {
    const text = describeSession([
      msg('user', 'fix IS NULL in protodb filters'),
      msg('assistant', 'ok'),
      msg('user', '<command-name>/rename</command-name>'),
      msg('user', '[Image #4]'),
      msg('user', 'also nested transactions [Image #5]'),
      msg('user', 'and memadapter ordering'),
      msg('user', 'push and update'),
    ], CWD)
    expect(text).toContain('fix IS NULL in protodb filters')
    expect(text).toContain('also nested transactions')
    expect(text).toContain('push and update')
    expect(text).not.toContain('[Image')
    expect(text).not.toContain('command-name')
    expect(text).toContain("Claude's first reply:\nok")
    expect(text).toContain('Folder: bl/blocks/v1')
  })

  test('keeps the body of pasted text, the topic of many sessions', () => {
    const text = describeSession([
      msg('user', '  <pasted_content id="f94b"> Investigate and fix: blocks.v1 server-side merges pair renames on old git </pasted_content>'),
      msg('user', 'push and build'),
    ], CWD)
    expect(text).toContain('server-side merges pair renames')
    expect(text).not.toContain('pasted_content')
  })

  test('keeps plugin and skill commands, drops built-in noise and harness rows', () => {
    const text = describeSession([
      msg('user', '<command-message>x</command-message>\n<command-name>/engineering:improve-codebase-architecture</command-name>\n<command-args></command-args>'),
      msg('user', '<command-name>/model</command-name>\n<command-args>opus</command-args>'),
      msg('user', 'Another Claude session sent a message:\n<agent-message from="a1">report</agent-message>'),
      msg('user', '<task-notification><task-id>a1</task-id></task-notification>'),
      msg('user', 'Base directory for this skill: /x/skills/foo\n\n# Foo skill body'),
      msg('user', '[Image: source: /tmp/Screenshot.png]'),
      msg('user', 'move this branch to a worktree'),
    ], CWD)
    expect(text).toContain('/engineering:improve-codebase-architecture')
    expect(text).not.toContain('opus')
    expect(text).not.toContain('report')
    expect(text).not.toContain('task-id')
    expect(text).not.toContain('skill body')
    expect(text).not.toContain('Screenshot')
  })

  test('the full description adds the latest reply, edited files and a hint', () => {
    const text = describeSession([
      msg('user', 'fix IS NULL in protodb filters'),
      msg('assistant', 'On it.'),
      { role: 'assistant', text: 'Done, all green.', toolUses: [{ tool: 'Edit', input: { file_path: '/r/protodb/filter.go' } }] },
    ], CWD, { isFull: true, hint: 'protodb' })
    expect(text).toContain("Claude's latest reply:\nDone, all green.")
    expect(text).toContain('Files edited: protodb/filter.go')
    expect(text).toContain("hint for the name: protodb")
  })

  test('too little text: nothing to name from', () => {
    expect(describeSession([msg('user', '[Image #4]'), msg('user', 'hi')], CWD)).toBeNull()
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

  test('a prose reply renames nothing', async ($, on) => {
    const seen = stubEngine(on, 'I can see there are two topics here')
    await $.turn.complete(DONE as never)
    await settle($)
    expect(seen.commands).toEqual([])
  })
})

describe('/autoname', () => {
  test('renames a session that already has a name, from more of it, with a hint', async ($, on) => {
    const seen = stubEngine(on, 'protodb-null-fixes')
    await $.classic.UserPromptSubmit({ prompt: 'hi', source: 'user', session_title: 'mine' } as never)
    const { text } = await $.command.run({ command: 'autoname', args: 'protodb' })
    await settle($)
    expect(text).toContain('protodb-null-fixes')
    expect(seen.prompts[0]).toContain("hint for the name: protodb")
    expect(seen.commands).toEqual(['/rename protodb-null-fixes', `/color ${colorFor('protodb-null-fixes')}`])
  })

  test('says so when the model gives no usable name', async ($, on) => {
    const seen = stubEngine(on, null)
    const { text } = await $.command.run({ command: 'autoname', args: '' })
    await settle($)
    expect(text).toContain('Could not come up with a name')
    expect(seen.commands).toEqual([])
  })
})
