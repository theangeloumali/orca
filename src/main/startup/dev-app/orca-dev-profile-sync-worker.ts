import { spawnWorkerThread } from '../../worker-threads/worker-thread-spawn'
import {
  currentWorkerEntryLayout,
  resolveWorkerThreadEntryPath
} from '../../worker-threads/worker-thread-entry-path'
import { isRecord } from '../../persistence/profile-state/documents/profile-state-document-validation'
import { getAppEnvironment } from '../../../shared/app-lifecycle/app-environment'
import { getOrcaProdUserDataPath } from './orca-dev-app'
import type { OrcaDevProfileSyncPaths, OrcaDevProfileSyncReport } from './orca-dev-profile-sync'

const WORKER_FILENAME = 'orca-dev-profile-sync-worker-entry.js'
// SQLite waits up to 5s per busy database; a hung copy must not hold launch forever.
const SYNC_TIMEOUT_MS = 30_000

type OrcaDevProfileSyncResult = OrcaDevProfileSyncReport | { kind: 'failed'; error: string }

/** Never rejects: a failed sync launches Orca Dev on the data it already has. */
export function runOrcaDevProfileSync(
  paths: OrcaDevProfileSyncPaths,
  options: { workerPath?: string; timeoutMs?: number } = {}
): Promise<OrcaDevProfileSyncResult> {
  return new Promise((resolve) => {
    const workerPath =
      options.workerPath ??
      resolveWorkerThreadEntryPath(currentWorkerEntryLayout(__dirname), WORKER_FILENAME)
    const worker = spawnWorkerThread(workerPath, {
      name: 'orca-dev-profile-sync',
      workerData: paths,
      execArgv: []
    })
    let result: OrcaDevProfileSyncResult | undefined
    const timer = setTimeout(() => {
      result ??= { kind: 'failed', error: 'Orca Dev profile sync timed out' }
      void worker.terminate().catch(() => undefined)
    }, options.timeoutMs ?? SYNC_TIMEOUT_MS)
    worker.on('message', (response: unknown) => {
      result ??= parseWorkerResponse(response)
    })
    worker.on('error', (error: unknown) => {
      result ??= { kind: 'failed', error: String(error) }
    })
    worker.once('exit', (code: number) => {
      clearTimeout(timer)
      result ??= { kind: 'failed', error: `worker exit code ${code}` }
      resolve(result)
    })
  })
}

function parseWorkerResponse(response: unknown): OrcaDevProfileSyncResult {
  if (!isRecord(response) || response.ok !== true || !isSyncReport(response.report)) {
    const error = isRecord(response) ? String(response.error) : 'Invalid worker response'
    return { kind: 'failed', error }
  }
  return response.report
}

function isSyncReport(value: unknown): value is OrcaDevProfileSyncReport {
  return isRecord(value) && (value.kind === 'done' || value.kind === 'prod-missing')
}

export async function syncOrcaDevProfileAtStartup(): Promise<void> {
  const environment = getAppEnvironment()
  const result = await runOrcaDevProfileSync({
    prodUserDataPath: getOrcaProdUserDataPath(environment.getPath('appData')),
    devUserDataPath: environment.getPath('userData')
  })
  console.info('[orca-dev] profile sync from Orca:', JSON.stringify(result))
}
