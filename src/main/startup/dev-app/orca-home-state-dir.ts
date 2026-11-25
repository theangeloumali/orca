import { homedir } from 'node:os'
import { join } from 'node:path'
import { IS_ORCA_DEV_APP } from './orca-dev-app'

/** Home-level credential and config state; Orca Dev keeps its own so it never edits prod's. */
export function getOrcaHomeStateDir(home = homedir(), isDevApp = IS_ORCA_DEV_APP): string {
  return join(home, isDevApp ? '.orca-dev-app' : '.orca')
}
