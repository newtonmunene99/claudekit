// State the autoname plugin keeps for a session, so a reload neither forgets
// nor repeats the one naming attempt.

// Whether the one naming attempt has started.
export type IsTried = boolean

declare module 'claude-code' {
  interface PluginState {
    autoname: {
      // Whether the session had a name when a prompt or start last said.
      hasTitle: boolean
      isTried: IsTried
    }
  }
}
