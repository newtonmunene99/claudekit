// Pure mapping from conductor_state.py's JSON to the HUD's snapshot, and the
// milestones worth a toast between two snapshots. No `$` here, so tests can
// feed it recorded script output.

import type { ConductorPlan, ConductorSnapshot, ConductorTodo } from '../types'

type Json = Record<string, any>

const str = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value)

const todo = (raw: Json): ConductorTodo => ({
  id: String(raw.id),
  content: String(raw.content ?? ''),
  phase: str(raw.phase),
})

// The track the HUD follows: of the tracks in progress, the one whose plan
// changed last (each todo update rewrites it), so starting a second track moves
// the HUD to it; else the recommended one. Ties keep tracks.md order.
export function pickTrack(tracks: Json, planMtimes: Record<string, number> = {}): Json | null {
  const all: Json[] = tracks.tracks ?? []
  const byId = (id: unknown) => all.find(t => t.track_id === id) ?? null
  const inFlight = ((tracks.in_progress ?? []) as unknown[]).map(byId).filter((t): t is Json => t !== null)
  let picked: Json | null = null
  for (const t of inFlight) {
    if (!picked || (planMtimes[t.plan] ?? 0) > (planMtimes[picked.plan] ?? 0)) picked = t
  }
  return picked ?? byId(tracks.recommended)
}

// Plans of the tracks in progress: the files whose changes can move the HUD.
export function inFlightPlans(tracks: Json): string[] {
  const ids = new Set(tracks.in_progress ?? [])
  return ((tracks.tracks ?? []) as Json[])
    .filter(t => ids.has(t.track_id) && t.plan)
    .map(t => String(t.plan))
}

export function toPlan(raw: Json): ConductorPlan {
  const ready: Json[] = raw.ready ?? []
  const waiting: Json[] = raw.waiting ?? []
  const counts: Json = raw.counts ?? {}
  const open = [...ready, ...waiting, ...(raw.blocked ?? [])]
    .map(t => str(t.phase))
    .filter((p): p is string => p !== null)
  return {
    path: String(raw.plan),
    name: str(raw.name),
    done: (counts.completed ?? 0) + (counts.deferred ?? 0),
    total: raw.total ?? 0,
    next: raw.next ? todo(raw.next) : null,
    ready: ready.map(todo),
    waiting: waiting.map(t => ({ ...todo(t), blockedBy: (t.blocked_by ?? []).map(String) })),
    blocked: (raw.blocked ?? []).map((b: Json) => ({ id: String(b.id), on: str(b.on) })),
    deferred: (raw.deferred ?? []).map((d: Json) => ({ id: String(d.id), phase: str(d.phase) })),
    parallelBatch: (raw.parallel_batch ?? []).map(String),
    reviewRounds: Number(raw.review_rounds ?? 0),
    phases: (raw.phases ?? []).map(String),
    openPhases: [...new Set(open)],
    blockedReason: str(raw.blocked_reason),
  }
}

// otherPlans: the script's plan JSON for the other tracks in progress, by track id.
export function toSnapshot(
  tracks: Json,
  plan: Json | null,
  planMtimes: Record<string, number> = {},
  otherPlans: Record<string, Json> = {},
): ConductorSnapshot {
  const track = pickTrack(tracks, planMtimes)
  const inFlight: string[] = (tracks.in_progress ?? []).map(String)
  const others = inFlight
    .filter(id => id !== track?.track_id)
    .map(id => {
      const t = ((tracks.tracks ?? []) as Json[]).find(x => x.track_id === id)
      const raw = otherPlans[id]
      const p = raw && !raw.error ? toPlan(raw) : null
      return {
        trackId: id,
        description: str(t?.description),
        done: p?.done ?? 0,
        total: p?.total ?? 0,
        next: p?.next ?? null,
      }
    })
  return {
    trackId: track?.track_id ?? null,
    inFlight,
    others,
    description: track?.description ?? null,
    isInProgress: track?.status === 'in_progress',
    plan: plan && !plan.error ? toPlan(plan) : null,
    recommended: tracks.recommended ?? null,
    eligible: (tracks.eligible ?? []).map((t: Json) => String(t.track_id)),
    blockedTracks: (tracks.blocked ?? []).map((t: Json) => ({
      id: String(t.track_id),
      missing: (t.missing ?? []).map(String),
    })),
    archivable: (tracks.archivable ?? []).map(String),
    allComplete: Boolean(tracks.all_complete),
  }
}

// What changed between two refreshes that the person would otherwise only
// find in scrollback.
export function milestones(prev: ConductorSnapshot | null, next: ConductorSnapshot): string[] {
  if (!prev) return []
  const out: string[] = []

  if (prev.isInProgress && prev.trackId && next.archivable.includes(prev.trackId)) {
    out.push(`Conductor: track ${prev.trackId} complete`)
  }

  const a = prev.plan
  const b = next.plan
  if (!a || !b || a.path !== b.path) return out

  for (const phase of a.openPhases) {
    if (!b.openPhases.includes(phase) && b.phases.includes(phase)) {
      out.push(`Conductor: phase ${phase} done`)
    }
  }
  const wasBlocked = new Set(a.blocked.map(t => t.id))
  for (const t of b.blocked) {
    if (!wasBlocked.has(t.id)) out.push(`Conductor: ${t.id} blocked${t.on ? ` on ${t.on}` : ''}`)
  }
  if (a.reviewRounds < 2 && b.reviewRounds >= 2) {
    out.push('Conductor: review hit its 2-round limit; the next round escalates')
  }
  return out
}

// The engine already prefixes a plugin's status line with its name.
export function statusText(s: ConductorSnapshot | null): string | undefined {
  if (!s?.trackId) return undefined
  const more = s.inFlight.length > 1 ? ` (+${s.inFlight.length - 1} in flight)` : ''
  if (s.isInProgress && s.plan) return `${s.trackId} ${s.plan.done}/${s.plan.total}${more}`
  if (s.isInProgress) return `${s.trackId}${more}`
  return `next track ${s.trackId}`
}

// The band shows the in-progress track's plan; the status line stands in for it
// otherwise, so the two never repeat each other.
export function hasBand(s: ConductorSnapshot | null): boolean {
  return Boolean(s?.isInProgress && s.plan)
}
