// General-purpose mods. This module only wires features: each lives in
// features/<name>/ and runs when its userConfig switch is on.

import type { Register } from 'claude-code'

import { registerUsage } from '../features/usage/register'

export const register: Register = (on, options) => {
  if (options.usage !== false) registerUsage(on)
}
