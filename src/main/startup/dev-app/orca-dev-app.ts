import { IS_ORCA_DEV_APP } from '../../../shared/fork/orca-dev-app-flag'

export { IS_ORCA_DEV_APP }
export {
  ORCA_DEV_APP_USER_DATA_DIR_NAME,
  ORCA_DEV_LAUNCH_MARKER_FILE,
  getOrcaDevAppUserDataPath,
  getOrcaProdUserDataPath
} from './orca-dev-app-paths'

export const ORCA_DEV_APP_NAME = 'Orca Dev'
export const ORCA_DEV_APP_USER_MODEL_ID = 'com.theangeloumali.orca.dev'

// Prod uses the runtime default and `pnpm dev` uses 6769, so all three can run side by side.
const PNPM_DEV_DESKTOP_WS_PORT = 6769
const ORCA_DEV_APP_DESKTOP_WS_PORT = 6770

export function resolveDevDesktopWsPort(args: {
  isPackaged: boolean
  isDevApp?: boolean
}): number | undefined {
  if (args.isDevApp ?? IS_ORCA_DEV_APP) {
    return ORCA_DEV_APP_DESKTOP_WS_PORT
  }
  return args.isPackaged ? undefined : PNPM_DEV_DESKTOP_WS_PORT
}
