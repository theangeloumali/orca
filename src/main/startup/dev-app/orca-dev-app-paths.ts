// orca-dev-install loads this file under plain node, so it imports node built-ins only.
import { join } from 'node:path'

/** orca-dev-install waits for this file with its build's commit; no match in time rolls back. */
export const ORCA_DEV_LAUNCH_MARKER_FILE = 'orca-dev-launched.json'

/** Not prod's `orca`, and no "orca-dev" substring: CLI checks read that as a `pnpm dev` profile. */
export const ORCA_DEV_APP_USER_DATA_DIR_NAME = 'OrcaDev'

export function getOrcaDevAppUserDataPath(appDataPath: string): string {
  return join(appDataPath, ORCA_DEV_APP_USER_DATA_DIR_NAME)
}

/** Packaged prod Orca's default userData; Orca Dev syncs from it read-only. */
export function getOrcaProdUserDataPath(appDataPath: string): string {
  return join(appDataPath, 'orca')
}
