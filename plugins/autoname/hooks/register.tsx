// Names a session Claude Code left unnamed: after the first main turn, a
// short Haiku-made slug goes to /rename and a colour picked from it to /color.
// It never renames a session that already has a name, and tries once.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { colorFor, namingText, toSlug } from './slug'

const hasTitle = atom({ plugin: 'autoname', key: 'hasTitle' } as const, false)
const isTried = atom({ plugin: 'autoname', key: 'isTried' } as const, false)

const ASK =
  'Name this coding session in 2 to 4 lowercase words joined by hyphens, like "protodb-null-fixes". ' +
  'Reply with the name only.\n\nWhat the person asked for:\n'

async function nameSession($: EngineInterface, text: string, isColor: boolean): Promise<void> {
  const reply = await $.model.complete({ model: 'haiku', prompt: ASK + text, maxTokens: 20 })
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
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || (await read($, hasTitle)) || (await read($, isTried))) return done
    // Too little to name from yet: keep the one attempt for a later turn.
    const text = namingText(await $.session.messages())
    if (!text) return done
    await update($, isTried, () => true)
    // In the background: the commands queue until the session is idle.
    nameSession($, text, isColor).catch(() => {})
    return done
  })
}
