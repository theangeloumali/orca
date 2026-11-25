import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { swapOrcaDevApp } from './orca-dev-app-swap.mjs'

const COMMIT = 'c'.repeat(40)

async function makeApp(path, version) {
  await mkdir(join(path, 'Contents'), { recursive: true })
  await writeFile(join(path, 'Contents', 'version'), version)
}

const appVersion = (path) => readFile(join(path, 'Contents', 'version'), 'utf8')

describe('swapOrcaDevApp', () => {
  let root
  let appPath
  let builtAppPath
  let markerPath
  let events

  /** Fake macOS: `launches` decides what the opened app writes to the marker. */
  function fakeOps(overrides = {}) {
    let running = overrides.running ?? false
    return {
      isRunning: async () => running,
      requestQuit: async () => {
        events.push('quit')
        running = overrides.refusesQuit ?? false
      },
      copyApp: overrides.copyApp ?? ((from, to) => cp(from, to, { recursive: true })),
      stripQuarantine: async (path) => events.push(`xattr ${path}`),
      open: async (path) => {
        events.push(`open ${path}`)
        const launched = overrides.launches?.(path)
        if (launched) {
          await writeFile(markerPath, JSON.stringify(launched))
        }
      },
      killApp: async (path) => events.push(`kill ${path}`),
      sleepTick: async () => undefined
    }
  }

  const swap = (ops) =>
    swapOrcaDevApp({
      builtAppPath,
      appPath,
      markerPath,
      commit: COMMIT,
      ops,
      quitTicks: 3,
      healthTicks: 3
    })

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'orca-dev-swap-'))
    appPath = join(root, 'Applications', 'Orca Dev.app')
    builtAppPath = join(root, 'dist', 'mac-arm64', 'Orca Dev.app')
    markerPath = join(root, 'OrcaDev', 'orca-dev-launched.json')
    events = []
    await mkdir(join(root, 'OrcaDev'), { recursive: true })
    await makeApp(builtAppPath, 'new')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('installs the new build once it reports this commit, keeping the old one beside it', async () => {
    await makeApp(appPath, 'old')
    // A stale marker from the old build must not pass the health check.
    await writeFile(markerPath, JSON.stringify({ commit: 'old', pid: 1 }))
    const result = await swap(fakeOps({ launches: () => ({ commit: COMMIT, pid: 2 }) }))
    expect(result).toEqual({ kind: 'installed', previousKept: true })
    expect(await appVersion(appPath)).toBe('new')
    expect(await appVersion(`${appPath}.previous`)).toBe('old')
    expect(events).toEqual([`xattr ${appPath}`, `open ${appPath}`])
  })

  it('installs on a first run with no previous app', async () => {
    const result = await swap(fakeOps({ launches: () => ({ commit: COMMIT, pid: 2 }) }))
    expect(result).toEqual({ kind: 'installed', previousKept: false })
    expect(await appVersion(appPath)).toBe('new')
  })

  it('quits a running Orca Dev, and only Orca Dev, before swapping', async () => {
    await makeApp(appPath, 'old')
    const result = await swap(
      fakeOps({ running: true, launches: () => ({ commit: COMMIT, pid: 2 }) })
    )
    expect(result.kind).toBe('installed')
    expect(events[0]).toBe('quit')
  })

  it('touches nothing when Orca Dev will not quit', async () => {
    await makeApp(appPath, 'old')
    const result = await swap(fakeOps({ running: true, refusesQuit: true }))
    expect(result.kind).toBe('quit-refused')
    expect(await appVersion(appPath)).toBe('old')
    expect(existsSync(`${appPath}.previous`)).toBe(false)
  })

  it('rolls back and reopens the old app when the new one never reports starting', async () => {
    await makeApp(appPath, 'old')
    const result = await swap(fakeOps({ launches: () => null }))
    expect(result).toMatchObject({ kind: 'rolled-back', restored: true })
    expect(await appVersion(appPath)).toBe('old')
    expect(existsSync(`${appPath}.previous`)).toBe(false)
    expect(events).toEqual([
      `xattr ${appPath}`,
      `open ${appPath}`,
      `kill ${appPath}`,
      `open ${appPath}`
    ])
  })

  it('rolls back when the running app reports a different commit', async () => {
    await makeApp(appPath, 'old')
    const result = await swap(fakeOps({ launches: () => ({ commit: 'other', pid: 2 }) }))
    expect(result.kind).toBe('rolled-back')
    expect(await appVersion(appPath)).toBe('old')
  })

  it('removes a failed first install rather than leave a broken app', async () => {
    const result = await swap(fakeOps({ launches: () => null }))
    expect(result).toMatchObject({ kind: 'rolled-back', restored: false })
    expect(existsSync(appPath)).toBe(false)
  })

  it('restores the old app when the copy fails part way', async () => {
    await makeApp(appPath, 'old')
    const copyApp = async (_from, to) => {
      await makeApp(to, 'partial')
      throw new Error('disk full')
    }
    const result = await swap(fakeOps({ copyApp }))
    expect(result).toMatchObject({ kind: 'rolled-back', restored: true })
    expect(result.reason).toMatch(/disk full/)
    expect(await appVersion(appPath)).toBe('old')
  })

  it('refuses any target but Orca Dev.app, so prod Orca is never replaced', async () => {
    const prodAppPath = join(root, 'Applications', 'Orca.app')
    await makeApp(prodAppPath, 'prod')
    await expect(
      swapOrcaDevApp({
        builtAppPath,
        appPath: prodAppPath,
        markerPath,
        commit: COMMIT,
        ops: fakeOps()
      })
    ).rejects.toThrow(/Orca Dev\.app/)
    expect(await appVersion(prodAppPath)).toBe('prod')
  })
})
