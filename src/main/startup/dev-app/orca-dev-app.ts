import { join } from 'node:path'

/** True only in the installed Orca Dev build (ORCA_FORK_DEV_APP=1 at build time). */
export const IS_ORCA_DEV_APP =
  typeof ORCA_FORK_DEV_APP !== 'undefined' && ORCA_FORK_DEV_APP === true

export const ORCA_DEV_APP_NAME = 'Orca Dev'
export const ORCA_DEV_APP_USER_MODEL_ID = 'com.theangeloumali.orca.dev'
/** orca-dev-install waits for this file with its build's commit; no match in time rolls back. */
export const ORCA_DEV_LAUNCH_MARKER_FILE = 'orca-dev-launched.json'

// Prod uses the runtime default and `pnpm dev` uses 6769, so all three can run side by side.
const PNPM_DEV_DESKTOP_WS_PORT = 6769
const ORCA_DEV_APP_DESKTOP_WS_PORT = 6770

/** Not prod's `orca`, and no "orca-dev" substring: CLI checks read that as a `pnpm dev` profile. */
export function getOrcaDevAppUserDataPath(appDataPath: string): string {
  return join(appDataPath, 'OrcaDev')
}

/** Packaged prod Orca's default userData; Orca Dev syncs from it read-only. */
export function getOrcaProdUserDataPath(appDataPath: string): string {
  return join(appDataPath, 'orca')
}

export function resolveDevDesktopWsPort(args: {
  isPackaged: boolean
  isDevApp?: boolean
}): number | undefined {
  if (args.isDevApp ?? IS_ORCA_DEV_APP) {
    return ORCA_DEV_APP_DESKTOP_WS_PORT
  }
  return args.isPackaged ? undefined : PNPM_DEV_DESKTOP_WS_PORT
}
