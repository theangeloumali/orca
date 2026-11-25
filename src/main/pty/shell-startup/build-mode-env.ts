import { ORCA_FORK_DEV_APP_ENV } from '../../../shared/fork/orca-dev-app-flag'

export function stripInheritedBuildModeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // Orca inherits its own build mode; leaking it changes user next/Vitest behavior. Explicit spawn env and rc files still win.
  const next = { ...env }
  delete next.NODE_ENV
  delete next[ORCA_FORK_DEV_APP_ENV]
  return next
}
