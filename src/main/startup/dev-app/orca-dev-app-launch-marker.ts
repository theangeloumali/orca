import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAppEnvironment } from '../../../shared/app-lifecycle/app-environment'
import { ORCA_DEV_LAUNCH_MARKER_FILE } from './orca-dev-app'

export async function writeOrcaDevLaunchMarker(args: {
  userDataPath: string
  commit: string
  pid: number
}): Promise<void> {
  await mkdir(args.userDataPath, { recursive: true, mode: 0o700 })
  await writeFile(
    join(args.userDataPath, ORCA_DEV_LAUNCH_MARKER_FILE),
    JSON.stringify({ commit: args.commit, pid: args.pid })
  )
}

/** Fire-and-forget: a missing marker only fails the install health check, never the launch. */
export function markOrcaDevLaunched(): void {
  const commit = typeof ORCA_BUILD_COMMIT === 'string' ? ORCA_BUILD_COMMIT : ''
  void writeOrcaDevLaunchMarker({
    userDataPath: getAppEnvironment().getPath('userData'),
    commit,
    pid: process.pid
  }).catch((error: unknown) => console.warn('[orca-dev] could not record the launch:', error))
}
