// State the statusline plugin keeps for a session.

export type UsageTokens = {
  // Input tokens sent uncached, including those written to the cache.
  input: number
  output: number
  cacheRead: number
}

declare module 'claude-code' {
  interface PluginState {
    statusline: {
      tokens: UsageTokens
      // "<folder> (<branch>[✗]) · <model>[ · <title>] · <id8>", or null before
      // the first reading.
      identity: string | null
      // The session's name as the last session start or prompt carried it.
      title: string | null
    }
  }
}
