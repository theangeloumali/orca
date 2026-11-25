import { parentPort, workerData } from 'node:worker_threads'
import { isRecord } from '../../persistence/profile-state/documents/profile-state-document-validation'
import { installWorkerSendLedger } from '../../worker-threads/worker-send-ledger'
import { syncOrcaDevProfilesFromProd } from './orca-dev-profile-sync'

installWorkerSendLedger('orca-dev-profile-sync')

if (!parentPort) {
  throw new Error('Orca Dev profile sync must run on a worker thread')
}
const port = parentPort
const request: unknown = workerData
if (
  !isRecord(request) ||
  typeof request.prodUserDataPath !== 'string' ||
  typeof request.devUserDataPath !== 'string'
) {
  throw new Error('Invalid Orca Dev profile sync request')
}

try {
  const report = syncOrcaDevProfilesFromProd({
    prodUserDataPath: request.prodUserDataPath,
    devUserDataPath: request.devUserDataPath
  })
  port.postMessage({ ok: true, report })
} catch (error) {
  port.postMessage({ ok: false, error: String(error) })
} finally {
  port.close()
}
