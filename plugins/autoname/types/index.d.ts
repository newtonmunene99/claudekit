// State the autoname plugin keeps for a session, so a reload neither forgets
// nor repeats the one naming attempt.

// The session's first prompt from the person, the slug's source.
export type FirstPrompt = string | null

declare module 'claude-code' {
  interface PluginState {
    autoname: {
      firstPrompt: FirstPrompt
      // Whether the session had a name when a prompt or start last said.
      hasTitle: boolean
      // Set once the naming attempt has started.
      isTried: boolean
    }
  }
}
