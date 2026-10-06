// Names a session Claude Code left unnamed: after the first main turn, a
// short Haiku-made slug goes to /rename and a colour picked from it to /color.
// It never renames a session that already has a name, and tries once.
// /autoname names it on demand, from more of the session, whatever its name.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { SYSTEM, colorFor, describeSession, namingPrompt, toSlug } from './slug'

const hasTitle = atom({ plugin: 'autoname', key: 'hasTitle' } as const, false)
const isTried = atom({ plugin: 'autoname', key: 'isTried' } as const, false)

async function slugFor($: EngineInterface, description: string): Promise<string | null> {
  const reply = await $.model.complete({
    model: 'haiku',
    system: SYSTEM,
    prompt: namingPrompt(description),
    maxTokens: 20,
    effort: 'low',
    timeoutMs: 20000,
  })
  return reply.isAnswered ? toSlug(reply.text) : null
}

async function applyName($: EngineInterface, slug: string, isColor: boolean): Promise<void> {
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

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'autoname',
      description: 'Name this session from what it has covered so far',
      argumentHint: '[hint]',
    })
    return next(e)
  })

  on('command.run', { command: 'autoname' }, async ($, e) => {
    await update($, isTried, () => true)
    const description = describeSession(await $.session.messages(), await $.session.cwd(), {
      isFull: true,
      hint: e.args,
    })
    if (!description) return { text: 'Nothing to name this session from yet.' }
    const slug = await slugFor($, description)
    if (!slug) return { text: 'Could not come up with a name. Try again, or give a hint: /autoname <hint>' }
    // A command can't run another while the turn waits on this hook: queue
    // /rename and /color on a timer of their own.
    $.clock.after(0, () => applyName($, slug, isColor).catch(() => {}))
    return { text: `Naming this session ${slug}` }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || (await read($, hasTitle)) || (await read($, isTried))) return done
    // Too little to name from yet: keep the one attempt for a later turn.
    const description = describeSession(await $.session.messages(), await $.session.cwd())
    if (!description) return done
    await update($, isTried, () => true)
    // In the background: the commands queue until the session is idle.
    slugFor($, description)
      .then(slug => (slug ? applyName($, slug, isColor) : undefined))
      .catch(() => {})
    return done
  })
}
