// Names a session Claude Code left unnamed: after the first main turn, a
// short Haiku-made slug goes to /rename and a colour picked from it to /color.
// It never renames a session that already has a name, and tries once.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { colorFor, toSlug } from './slug'

const firstPrompt = atom({ plugin: 'autoname', key: 'firstPrompt' } as const, null)
const hasTitle = atom({ plugin: 'autoname', key: 'hasTitle' } as const, false)
const isTried = atom({ plugin: 'autoname', key: 'isTried' } as const, false)

const ASK =
  'Name this coding session in 2 to 4 lowercase words joined by hyphens, like "protodb-null-fixes". ' +
  'Reply with the name only.\n\nThe first request:\n'

async function nameSession($: EngineInterface, prompt: string, isColor: boolean): Promise<void> {
  const reply = await $.model.complete({ model: 'haiku', prompt: ASK + prompt.slice(0, 2000), maxTokens: 20 })
  const slug = reply.isAnswered ? toSlug(reply.text) : null
  if (!slug) return
  await $.command.run({ command: 'rename', args: slug })
  if (isColor) await $.command.run({ command: 'color', args: colorFor(slug) })
}

async function noteTitle($: EngineInterface, name: string | undefined): Promise<void> {
  if (name?.trim() && !(await read($, hasTitle))) await update($, hasTitle, () => true)
}

export const register: Register = (on, options) => {
  const isColor = options.color !== false

  // The session's name only arrives on these settings-hook events.
  on('classic.SessionStart', async ($, e, next) => {
    await noteTitle($, e.session_title)
    return next(e)
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    await noteTitle($, e.session_title)
    if ((e.source === undefined || e.source === 'user') && !(await read($, firstPrompt))) {
      await update($, firstPrompt, () => e.prompt)
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const prompt = await read($, firstPrompt)
    if (e.agentId || !prompt || (await read($, hasTitle)) || (await read($, isTried))) return done
    await update($, isTried, () => true)
    // In the background: the commands queue until the session is idle.
    nameSession($, prompt, isColor).catch(() => {})
    return done
  })
}
