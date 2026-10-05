// State the Conductor HUD keeps for a session: what conductor_state.py last
// reported, reduced to what the status line, band and board draw.

export type ConductorTodo = {
  id: string
  content: string
  phase: string | null
}

export type ConductorWaitingTodo = ConductorTodo & { blockedBy: string[] }

export type ConductorPlan = {
  path: string
  name: string | null
  done: number
  total: number
  next: ConductorTodo | null
  ready: ConductorTodo[]
  waiting: ConductorWaitingTodo[]
  blocked: { id: string; on: string | null }[]
  deferred: { id: string; phase: string | null }[]
  parallelBatch: string[]
  reviewRounds: number
  phases: string[]
  // Phases that still hold a todo that is not completed or deferred.
  openPhases: string[]
  blockedReason: string | null
}

// A track in progress other than the followed one, as the board lists it.
export type ConductorTrackSummary = {
  trackId: string
  description: string | null
  done: number
  total: number
  next: ConductorTodo | null
}

export type ConductorSnapshot = {
  trackId: string | null
  // Every track in progress, in tracks.md order; trackId is the one followed.
  inFlight: string[]
  // The other tracks in flight, in tracks.md order.
  others: ConductorTrackSummary[]
  description: string | null
  isInProgress: boolean
  plan: ConductorPlan | null
  recommended: string | null
  eligible: string[]
  blockedTracks: { id: string; missing: string[] }[]
  archivable: string[]
  allComplete: boolean
}

declare module 'claude-code' {
  interface PluginState {
    conductor: {
      snapshot: ConductorSnapshot | null
      isBandHidden: boolean
    }
  }
}
