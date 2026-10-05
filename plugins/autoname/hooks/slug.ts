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
