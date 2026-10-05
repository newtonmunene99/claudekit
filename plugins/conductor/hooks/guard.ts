// Keeps todo status changes on conductor_state.py set-todo, as
// templates/conductor-protocol.md asks. Pure, so tests can call it directly.
//
// Gotcha: this matches spellings, so it is a guardrail against slips, not a
// security boundary. Plan edits that leave statuses alone (review_rounds, new
// pending todos, body text) always pass, because skills make them by hand.

const PLAN_PATH = /(^|\/)conductor\/plans\/[^/]+\.plan\.md$/
const STATUS_LINE = /^\s*status:\s*['"]?([A-Za-z_]+)['"]?\s*$/gm

export const isPlanPath = (path: string): boolean => PLAN_PATH.test(path)

function statusCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const m of text.matchAll(STATUS_LINE)) {
    const s = m[1] ?? ''
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return counts
}

// True when `after` moved a todo's status, as opposed to adding new pending
// todos or touching other fields.
export function changesStatus(before: string, after: string): boolean {
  const a = statusCounts(before)
  const b = statusCounts(after)
  for (const s of new Set([...a.keys(), ...b.keys()])) {
    const delta = (b.get(s) ?? 0) - (a.get(s) ?? 0)
    if (delta === 0) continue
    if (s === 'pending' && delta > 0) continue
    return true
  }
  return false
}

const IN_PLACE = /\b(sed|perl)\b[^|;&]*\s-[a-zA-Z]*i/
const REDIRECT = /(>|\btee\b)\s*['"]?\S*conductor\/(plans\/\S+\.plan\.md|context\/tracks\.md)/
const TARGET = /conductor\/(plans\/\S+\.plan\.md|context\/tracks\.md)/

// True when a shell command rewrites a plan or the registry in place.
export function rewritesConductorFile(command: string): boolean {
  if (command.includes('conductor_state.py')) return false
  return (IN_PLACE.test(command) && TARGET.test(command)) || REDIRECT.test(command)
}

export function denyReason(script: string): string {
  return (
    'conductor: change todo status with ' +
    `\`python3 "${script}" set-todo <plan> <todo_id> <status>\` ` +
    '(and track status with `track-status`), not by hand. ' +
    'Hand edits have mangled plans before; see the Deterministic Plumbing Protocol.'
  )
}
