// Pure helpers for naming a session: the model's reply cleaned into a slug,
// and a colour picked from the slug so the same name always gets the same one.

// The colours /color takes.
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'] as const

// Lowercase words joined by hyphens, at most four; null when nothing is left.
export function toSlug(reply: string): string | null {
  const words = reply
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
  return words.length > 0 ? words.join('-') : null
}

export function colorFor(slug: string): (typeof COLORS)[number] {
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length] ?? 'blue'
}

// What the person asked for, from the transcript: their first three prompts
// and the latest, with slash-command rows and image placeholders dropped.
// Null when under 20 characters are left, too little to name from. Reading
// the transcript, not the first prompt seen, keeps a mid-session install from
// naming the session after whatever came next.
export function namingText(messages: readonly { role: string; text: string }[]): string | null {
  const prompts = messages
    .filter(m => m.role === 'user' && !m.text.trimStart().startsWith('<'))
    .map(m => m.text.replace(/\[Image #\d+\]/g, '').trim())
    .filter(Boolean)
  const picked = [...new Set([...prompts.slice(0, 3), ...prompts.slice(-1)])]
  const text = picked.join('\n---\n').slice(0, 2000)
  return text.replace(/\s/g, '').length >= 20 ? text : null
}
