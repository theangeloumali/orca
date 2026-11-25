import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'

class FakeWorker extends EventEmitter {
  terminate = vi.fn(async () => {
    this.emit('exit', 1)
    return 1
  })
}

const spawned = vi.hoisted(() => {
  const workers: unknown[] = []
  const options: unknown[] = []
  return { workers, options }
})
vi.mock('../../worker-threads/worker-thread-spawn', () => ({
  spawnWorkerThread: (_filename: string, options: unknown) => {
    const worker = new FakeWorker()
    spawned.workers.push(worker)
    spawned.options.push(options)
    return worker
  }
}))

const paths = { prodUserDataPath: '/appdata/orca', devUserDataPath: '/appdata/OrcaDev' }

function lastWorker(): FakeWorker {
  const worker = spawned.workers.at(-1)
  if (!(worker instanceof FakeWorker)) {
    throw new Error('no worker spawned')
  }
  return worker
}

describe('runOrcaDevProfileSync', () => {
  afterEach(() => {
    spawned.workers.length = 0
    spawned.options.length = 0
    vi.useRealTimers()
  })

  it('returns the worker report once the worker exits cleanly', async () => {
    const { runOrcaDevProfileSync } = await import('./orca-dev-profile-sync-worker')
    const pending = runOrcaDevProfileSync(paths, { workerPath: '/out/entry.js' })
    const report = { kind: 'done', indexAdded: [], profiles: [] }
    lastWorker().emit('message', { ok: true, report })
    lastWorker().emit('exit', 0)
    await expect(pending).resolves.toEqual(report)
    expect(spawned.options[0]).toMatchObject({ name: 'orca-dev-profile-sync', workerData: paths })
  })

  it('reports a worker error instead of throwing, so launch continues on old data', async () => {
    const { runOrcaDevProfileSync } = await import('./orca-dev-profile-sync-worker')
    const pending = runOrcaDevProfileSync(paths, { workerPath: '/out/entry.js' })
    lastWorker().emit('message', { ok: false, error: 'boom' })
    lastWorker().emit('exit', 0)
    await expect(pending).resolves.toEqual({ kind: 'failed', error: 'boom' })
  })

  it('stops a hung worker after the timeout', async () => {
    vi.useFakeTimers()
    const { runOrcaDevProfileSync } = await import('./orca-dev-profile-sync-worker')
    const pending = runOrcaDevProfileSync(paths, { workerPath: '/out/entry.js', timeoutMs: 50 })
    await vi.advanceTimersByTimeAsync(50)
    await expect(pending).resolves.toEqual({
      kind: 'failed',
      error: 'Orca Dev profile sync timed out'
    })
    expect(lastWorker().terminate).toHaveBeenCalled()
  })
})
