/** The app selects the local serve runtime; the CLI runs that selection. */
import { dirname, join } from 'node:path'
import { runProcess, spawnProcess } from '@orca/process-host'
import type { ProcessSpec } from '@orca/process-host/process-spec'
import {
  ORCAD_LOCAL_SERVE_SELECTION_ENTRY,
  ORCAD_LOCAL_SERVE_SELECTION_FLAGS as FLAGS,
  SERVE_RUNTIME_ENV,
  parseServeRuntimeSelection,
  type ServeRuntimeSelection
} from '../../../../shared/remote-runtime/serve-supervisor/orcad-local-serve-selection'
import { waitForRecipeJson } from './serve-recipe-json'
import { superviseForegroundServe } from '../updates/serve-update-supervisor'
import { isSupervisedSpawnHeld } from '../supervision/serve-supervised-stop'
import { redactingSpawn, shouldRedactSupervisedStdout } from './serve-pairing-redaction'
import {
  orcadServeArgs,
  type ServeOrcaAppArgs
} from '../../../../shared/remote-runtime/serve-supervisor/orcad-serve-argv'
import { ORCA_SERVE_APPIMAGE_ENV } from '../../../../shared/remote-runtime/serve-supervisor/orcad-server-launch-env'
import { SPEECH_RECOGNIZER_DIR_ENV } from '../../../../shared/speech/native-recognizer/speech-recognizer-package'
import { ORCA_SERVE_SUPERVISED_ENV } from '../../../../shared/remote-runtime/serve-supervisor/serve-supervised-terminal-durability'
import { IS_ORCA_DEV_APP, ORCA_FORK_DEV_APP_ENV } from '../../../../shared/fork/orca-dev-app-flag'

/** A first run may download and verify the pinned Node; bound it well past that. */
const SELECTION_TIMEOUT_MS = 10 * 60_000

export async function resolveLocalServeRuntime(
  options: {
    executable: string
    appRoot: string
    userDataPath: string
    usesMacUpdateHandoff: boolean
    env?: NodeJS.ProcessEnv
  },
  run: typeof runProcess = runProcess
): Promise<ServeRuntimeSelection> {
  // orcad has no updater; keep Electron for packaged macOS update handoffs unless orcad is asked for,
  // e.g. over SSH with no desktop login, where Electron cannot start.
  if (options.usesMacUpdateHandoff && (options.env ?? process.env)[SERVE_RUNTIME_ENV] !== 'orcad') {
    return {
      kind: 'electron',
      reason:
        'packaged macOS serve stays on Electron so paired clients can still update it (orcad has no app updater)'
    }
  }
  const entry = join(options.appRoot, 'out', 'main', `${ORCAD_LOCAL_SERVE_SELECTION_ENTRY}.js`)
  try {
    const result = await run({
      program: options.executable,
      args: [entry, FLAGS.userData, options.userDataPath, FLAGS.appRoot, options.appRoot],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      // Show pinned-Node download progress so first-run selection does not appear hung.
      stdio: ['ignore', 'pipe', 'inherit'],
      timeoutMs: SELECTION_TIMEOUT_MS
    })
    return (
      parseServeRuntimeSelection(result.stdout) ?? {
        kind: 'electron',
        reason: `the app did not answer which serve host to use (exit ${String(result.code)})`
      }
    )
  } catch (error) {
    return {
      kind: 'electron',
      reason: `the app could not check orcad: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

export function orcadServeEnv(input: {
  baseEnv: NodeJS.ProcessEnv
  userDataPath: string
  version: string
  supervise: boolean
  speechRecognizerDir?: string
  appImagePath?: string
}): NodeJS.ProcessEnv {
  return {
    ...input.baseEnv,
    // The desktop's profile: its instance lock makes the two refuse each other.
    ORCA_USER_DATA: input.userDataPath,
    ORCA_VERSION: input.version,
    // Always set: a value inherited from an Orca terminal would name another install's copy.
    [SPEECH_RECOGNIZER_DIR_ENV]: input.speechRecognizerDir ?? '',
    [ORCA_SERVE_APPIMAGE_ENV]: input.appImagePath ?? '',
    // orcad is built without the define; this is how it knows it belongs to Orca Dev.
    [ORCA_FORK_DEV_APP_ENV]: IS_ORCA_DEV_APP ? '1' : '',
    // A service manager restarts this server, so it must not run terminals that die with it.
    [ORCA_SERVE_SUPERVISED_ENV]: input.supervise ? '1' : ''
  }
}

/** Electron serve binds every interface (`exposeNetworkByDefault`); orcad does it on request. */
export function serveWithOrcad(
  selection: Extract<ServeRuntimeSelection, { kind: 'orcad' }>,
  args: ServeOrcaAppArgs,
  userDataPath: string,
  /** The caller's environment without `ELECTRON_RUN_AS_NODE`. */
  baseEnv: NodeJS.ProcessEnv,
  /** The app's browser client; the slot does not carry one, so orcad serves it from here. */
  webClientRoot?: string,
  /** orcad’s slot has no speech recognizer; use the app’s copy. */
  speechRecognizerDir?: string,
  appImagePath?: string
): Promise<number> {
  const spec: ProcessSpec = {
    program: selection.runtime,
    args: [selection.entry, ...orcadServeArgs(args, webClientRoot)],
    detached: args.recipeJson === true,
    cwd: dirname(selection.entry),
    stdio: args.recipeJson === true ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: orcadServeEnv({
      baseEnv,
      userDataPath,
      version: selection.version,
      supervise: args.supervise === true,
      speechRecognizerDir,
      appImagePath
    })
  }
  const spawnChild = shouldRedactSupervisedStdout(args.supervise === true)
    ? redactingSpawn(spawnProcess)
    : spawnProcess
  if (isSupervisedSpawnHeld()) {
    return Promise.resolve(0)
  }
  const child = spawnChild(spec)
  if (args.recipeJson) {
    return waitForRecipeJson(child)
  }
  return superviseForegroundServe({
    spec,
    spawnChild,
    child,
    handoffPath: null,
    expectedHandoff: null
  })
}
