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

// The track the HUD follows: the one in progress, else the recommended one.
export function pickTrack(tracks: Json): Json | null {
  const all: Json[] = tracks.tracks ?? []
  const id = tracks.in_progress?.[0] ?? tracks.recommended
  return all.find(t => t.track_id === id) ?? null
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

export function toSnapshot(tracks: Json, plan: Json | null): ConductorSnapshot {
  const track = pickTrack(tracks)
  return {
    trackId: track?.track_id ?? null,
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
  if (s.isInProgress && s.plan) return `${s.trackId} ${s.plan.done}/${s.plan.total}`
  if (s.isInProgress) return s.trackId
  return `next track ${s.trackId}`
}

// The band shows the in-progress track's plan; the status line stands in for it
// otherwise, so the two never repeat each other.
export function hasBand(s: ConductorSnapshot | null): boolean {
  return Boolean(s?.isInProgress && s.plan)
}
