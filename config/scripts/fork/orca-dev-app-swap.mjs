import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, rename, rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ORCA_DEV_APP_BUNDLE_NAME = 'Orca Dev.app'
const TICK_MS = 500
// 30s at TICK_MS for the quit wait.
const DEFAULT_QUIT_TICKS = 60
// 120s: the marker lands after the up-to-30s profile sync and the first window load.
const DEFAULT_HEALTH_TICKS = 240

/**
 * Replaces Orca Dev.app with a new build, keeping the old one as .previous until the new one
 * writes a launch marker with its own commit; otherwise the old one goes back and reopens.
 */
export async function swapOrcaDevApp({
  builtAppPath,
  appPath,
  markerPath,
  commit,
  ops,
  quitTicks = DEFAULT_QUIT_TICKS,
  healthTicks = DEFAULT_HEALTH_TICKS
}) {
  // Hard guard: whatever the caller passes, prod Orca.app is never a swap target.
  if (basename(appPath) !== ORCA_DEV_APP_BUNDLE_NAME) {
    throw new Error(`Refusing to replace ${appPath}: only ${ORCA_DEV_APP_BUNDLE_NAME} is swapped`)
  }
  if (!existsSync(builtAppPath)) {
    throw new Error(`No built app at ${builtAppPath}`)
  }
  if (!(await quitOrcaDev(ops, quitTicks))) {
    return { kind: 'quit-refused' }
  }
  await rm(markerPath, { force: true })
  const previousPath = `${appPath}.previous`
  await rm(previousPath, { recursive: true, force: true })
  const hadPrevious = existsSync(appPath)
  if (hadPrevious) {
    await rename(appPath, previousPath)
  }
  const rollBack = (reason) => restorePrevious({ appPath, previousPath, hadPrevious, ops, reason })
  try {
    await ops.copyApp(builtAppPath, appPath)
  } catch (error) {
    return rollBack(`copy failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  await ops.stripQuarantine(appPath)
  if (await launchedCleanly({ appPath, markerPath, commit, ops, healthTicks })) {
    return { kind: 'installed', previousKept: hadPrevious }
  }
  await ops.killApp(appPath)
  return rollBack('the new build did not report starting within the health check')
}

async function quitOrcaDev(ops, quitTicks) {
  if (!(await ops.isRunning())) {
    return true
  }
  await ops.requestQuit()
  for (let tick = 0; tick < quitTicks; tick++) {
    if (!(await ops.isRunning())) {
      return true
    }
    await ops.sleepTick()
  }
  return !(await ops.isRunning())
}

async function launchedCleanly({ appPath, markerPath, commit, ops, healthTicks }) {
  try {
    await ops.open(appPath)
  } catch {
    return false
  }
  for (let tick = 0; tick <= healthTicks; tick++) {
    if ((await readMarkerCommit(markerPath)) === commit) {
      return true
    }
    await ops.sleepTick()
  }
  return false
}

async function readMarkerCommit(markerPath) {
  try {
    const marker = JSON.parse(await readFile(markerPath, 'utf8'))
    return typeof marker?.commit === 'string' ? marker.commit : null
  } catch {
    return null
  }
}

async function restorePrevious({ appPath, previousPath, hadPrevious, ops, reason }) {
  await rm(appPath, { recursive: true, force: true })
  if (!hadPrevious) {
    return { kind: 'rolled-back', restored: false, reason }
  }
  await rename(previousPath, appPath)
  await ops.open(appPath).catch(() => undefined)
  return { kind: 'rolled-back', restored: true, reason }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** macOS operations, addressed by bundle id or exact bundle path so Orca itself is never hit. */
export function createMacSwapOps({ bundleId }) {
  const osascript = (script) => execFileAsync('osascript', ['-e', script])
  return {
    isRunning: async () => {
      // An unregistered bundle id (first install) errors, which means not running.
      const result = await osascript(`application id "${bundleId}" is running`).catch(() => null)
      return result?.stdout.trim() === 'true'
    },
    requestQuit: async () => {
      await osascript(`tell application id "${bundleId}" to quit`).catch(() => undefined)
    },
    copyApp: async (from, to) => {
      await execFileAsync('ditto', [from, to])
    },
    stripQuarantine: async (path) => {
      await execFileAsync('xattr', ['-dr', 'com.apple.quarantine', path]).catch(() => undefined)
    },
    open: async (path) => {
      await execFileAsync('open', [path])
    },
    killApp: async (path) => {
      const binaries = escapeRegExp(`${path}/Contents/MacOS/`)
      await execFileAsync('pkill', ['-f', '--', binaries]).catch(() => undefined)
    },
    sleepTick: () => new Promise((resolve) => setTimeout(resolve, TICK_MS))
  }
}
