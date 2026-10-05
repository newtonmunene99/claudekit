// State the mods plugin keeps for a session, one prefix per feature.

export type UsageTokens = {
  // Input tokens sent uncached, including those written to the cache.
  input: number
  output: number
  cacheRead: number
}

declare module 'claude-code' {
  interface PluginState {
    mods: {
      usageTokens: UsageTokens
      // "<folder> (<branch>[✗]) · <model>", or null before the first reading.
      usageIdentity: string | null
    }
  }
}
