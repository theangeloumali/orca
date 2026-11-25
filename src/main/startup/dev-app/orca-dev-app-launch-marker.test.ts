import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ORCA_DEV_LAUNCH_MARKER_FILE } from './orca-dev-app'
import {
  markOrcaDevLaunchedOnWindowLoad,
  writeOrcaDevLaunchMarker
} from './orca-dev-app-launch-marker'

describe('writeOrcaDevLaunchMarker', () => {
  let userDataPath: string

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), 'orca-dev-marker-'))
  })

  afterEach(async () => {
    await rm(userDataPath, { recursive: true, force: true })
  })

  it('records the commit and pid the installer health check waits for', async () => {
    await writeOrcaDevLaunchMarker({ userDataPath, commit: 'abc123', pid: 4242 })
    const marker: unknown = JSON.parse(
      await readFile(join(userDataPath, ORCA_DEV_LAUNCH_MARKER_FILE), 'utf8')
    )
    expect(marker).toEqual({ commit: 'abc123', pid: 4242 })
  })

  it('replaces a marker left by the previous build', async () => {
    const markerPath = join(userDataPath, ORCA_DEV_LAUNCH_MARKER_FILE)
    await writeFile(markerPath, JSON.stringify({ commit: 'old', pid: 1 }))
    await writeOrcaDevLaunchMarker({ userDataPath, commit: 'new', pid: 2 })
    expect(JSON.parse(await readFile(markerPath, 'utf8'))).toEqual({ commit: 'new', pid: 2 })
  })

  it('creates the userData folder on a first launch', async () => {
    const freshUserData = join(userDataPath, 'OrcaDev')
    await writeOrcaDevLaunchMarker({ userDataPath: freshUserData, commit: 'c', pid: 3 })
    expect(await readFile(join(freshUserData, ORCA_DEV_LAUNCH_MARKER_FILE), 'utf8')).toContain(
      '"c"'
    )
  })
})

describe('markOrcaDevLaunchedOnWindowLoad', () => {
  function fakeWebContents(): { once: typeof once; finishLoad: () => void } {
    const listeners: (() => void)[] = []
    const once = (_event: 'did-finish-load', listener: () => void): void => {
      listeners.push(listener)
    }
    return { once, finishLoad: () => listeners.splice(0).forEach((listener) => listener()) }
  }

  it('records the launch only once the main window has loaded', () => {
    const contents = fakeWebContents()
    const markLaunched = vi.fn()
    markOrcaDevLaunchedOnWindowLoad(contents, true, markLaunched)
    expect(markLaunched).not.toHaveBeenCalled()
    contents.finishLoad()
    expect(markLaunched).toHaveBeenCalledTimes(1)
  })

  it('records nothing outside Orca Dev', () => {
    const contents = fakeWebContents()
    const markLaunched = vi.fn()
    markOrcaDevLaunchedOnWindowLoad(contents, false, markLaunched)
    contents.finishLoad()
    expect(markLaunched).not.toHaveBeenCalled()
  })
})
