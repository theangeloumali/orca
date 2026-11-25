import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import {
  ORCA_DEV_LAUNCH_MARKER_FILE,
  getOrcaDevAppUserDataPath
} from '../../../src/main/startup/dev-app/orca-dev-app.ts'
import { createMacSwapOps, swapOrcaDevApp } from './orca-dev-app-swap.mjs'

const { resolveBuilderAppIdentity } = createRequire(import.meta.url)(
  './orca-dev-app-builder-identity.cjs'
)
const ORCA_DEV_IDENTITY = resolveBuilderAppIdentity({ ORCA_FORK_DEV_APP: '1' })
const BUILD_WORKTREE_NAME = 'dev-app-build'
const USAGE = 'Usage: orca-dev-install [branch | worktree path] [--dry-run]'

export function parseInstallArgs(argv) {
  let target = null
  let dryRun = false
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option ${arg}. ${USAGE}`)
    } else if (target === null) {
      target = arg
    } else {
      throw new Error(`Pass one branch or path. ${USAGE}`)
    }
  }
  return { target, dryRun }
}

/** Default: the main checkout. A directory builds in place; anything else is a branch. */
export function resolveBuildSource({ target, mainCheckout, isDirectory, git, fetch }) {
  if (target === null) {
    return { kind: 'default', ...describeCleanCheckout(mainCheckout, git) }
  }
  const targetPath = resolve(target)
  if (isDirectory(targetPath)) {
    if (!git(targetPath, ['rev-parse', '--show-toplevel']).ok) {
      throw new Error(`${targetPath} is not a git checkout`)
    }
    return { kind: 'path', ...describeCleanCheckout(targetPath, git) }
  }
  return resolveBranchSource({ branch: target, mainCheckout, git, fetch })
}

function describeCleanCheckout(checkoutPath, git) {
  assertClean(checkoutPath, git)
  return {
    label: gitOut(checkoutPath, ['rev-parse', '--abbrev-ref', 'HEAD'], git),
    checkoutPath,
    commit: gitOut(checkoutPath, ['rev-parse', 'HEAD'], git)
  }
}

function resolveBranchSource({ branch, mainCheckout, git, fetch }) {
  // A leading dash would reach git as an option.
  if (branch.startsWith('-') || !git(mainCheckout, ['check-ref-format', '--branch', branch]).ok) {
    throw new Error(`Not a valid branch name: ${branch}`)
  }
  if (fetch) {
    git(mainCheckout, ['fetch', 'origin', branch])
  }
  const [remote, local] = [`refs/remotes/origin/${branch}`, `refs/heads/${branch}`].map((ref) =>
    git(mainCheckout, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
  )
  // Origin wins unless the local branch already contains it (unpushed local commits).
  const localIsAhead =
    remote.ok &&
    local.ok &&
    git(mainCheckout, ['merge-base', '--is-ancestor', remote.out, local.out]).ok
  const commit = remote.ok && !localIsAhead ? remote.out : local.ok ? local.out : null
  if (!commit) {
    throw new Error(`No branch "${branch}" locally or on origin`)
  }
  const checkoutPath = join(mainCheckout, '.claude', 'worktrees', BUILD_WORKTREE_NAME)
  return { kind: 'branch', label: branch, checkoutPath, commit }
}

/** Branch builds share one detached worktree, so a branch checked out elsewhere still builds. */
export function prepareBuildCheckout({ source, mainCheckout, isDirectory, git }) {
  if (source.kind !== 'branch') {
    return
  }
  if (!isDirectory(source.checkoutPath)) {
    gitOut(mainCheckout, ['worktree', 'add', '--detach', source.checkoutPath, source.commit], git)
    return
  }
  assertClean(source.checkoutPath, git)
  gitOut(source.checkoutPath, ['checkout', '--detach', source.commit], git)
}

function assertClean(checkoutPath, git) {
  const status = gitOut(checkoutPath, ['status', '--porcelain'], git)
  if (status !== '') {
    throw new Error(
      `${checkoutPath} has uncommitted changes; commit or stash them so the build matches its commit`
    )
  }
}

function gitOut(cwd, args, git) {
  const result = git(cwd, args)
  if (!result.ok) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}`)
  }
  return result.out
}

export function pnpmSpecFromPackageManager(packageManager) {
  const match = /^(pnpm@\d+\.\d+\.\d+)(?:\+.*)?$/.exec(packageManager ?? '')
  if (!match) {
    throw new Error(`package.json packageManager is not a pinned pnpm: ${packageManager}`)
  }
  return match[1]
}

/** Mirrors build:mac, but packages an arm64 app folder instead of a dmg and zip. */
export function createBuildSteps({ checkoutPath, pnpmSpec }) {
  const pnpm = (label, ...args) => ({
    label,
    command: 'npx',
    args: ['-y', pnpmSpec, ...args],
    cwd: checkoutPath,
    env: { ORCA_FORK_DEV_APP: '1' }
  })
  return [
    pnpm('install', 'install', '--frozen-lockfile'),
    ...[
      'build:desktop',
      'build:computer-macos',
      'build:keyboard-layout-macos',
      'build:process-footprint-macos',
      'build:notification-status-macos',
      'ensure:electron-runtime'
    ].map((script) => pnpm(script, 'run', script)),
    pnpm(
      'package',
      'exec',
      'electron-builder',
      '--config',
      'config/electron-builder.config.cjs',
      '--mac',
      'dir',
      '--arm64'
    )
  ]
}

const runGit = (cwd, args) => {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
  return { ok: result.status === 0, out: (result.stdout ?? '').trim() }
}

const isDirectory = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true

function findMainCheckout() {
  const commonDir = gitOut(
    import.meta.dirname,
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    runGit
  )
  return dirname(commonDir)
}

function printPlan({ source, steps, appPath, markerPath, dryRun }) {
  console.log(
    `[orca-dev-install] ${dryRun ? 'DRY RUN — nothing is built or swapped' : 'Installing'}`
  )
  console.log(`  source:   ${source.kind} ${source.label}`)
  console.log(`  commit:   ${source.commit}`)
  console.log(`  checkout: ${source.checkoutPath}`)
  steps.forEach((step, index) => {
    console.log(`  step ${index + 1}:   ORCA_FORK_DEV_APP=1 ${step.command} ${step.args.join(' ')}`)
  })
  console.log(`  swap:     ${appPath} (old kept as .previous until the health check passes)`)
  console.log(`  health:   ${markerPath} must name ${source.commit}`)
}

async function main(argv) {
  const startedAt = performance.now()
  const { target, dryRun } = parseInstallArgs(argv)
  if (!dryRun && (process.platform !== 'darwin' || process.arch !== 'arm64')) {
    throw new Error('orca-dev-install builds Apple silicon macOS only')
  }
  const mainCheckout = findMainCheckout()
  // A dry run reads refs as they are: no fetch, no worktree.
  const source = resolveBuildSource({
    target,
    mainCheckout,
    isDirectory,
    git: runGit,
    fetch: !dryRun
  })
  const packageJsonPath = join(dryRun ? mainCheckout : source.checkoutPath, 'package.json')
  const pnpmSpec = pnpmSpecFromPackageManager(
    JSON.parse(readFileSync(packageJsonPath, 'utf8')).packageManager
  )
  const steps = createBuildSteps({ checkoutPath: source.checkoutPath, pnpmSpec })
  const appPath = join('/Applications', `${ORCA_DEV_IDENTITY.productName}.app`)
  const userDataPath = getOrcaDevAppUserDataPath(join(homedir(), 'Library', 'Application Support'))
  const markerPath = join(userDataPath, ORCA_DEV_LAUNCH_MARKER_FILE)
  printPlan({ source, steps, appPath, markerPath, dryRun })
  if (dryRun) {
    return 0
  }
  prepareBuildCheckout({ source, mainCheckout, isDirectory, git: runGit })
  for (const step of steps) {
    console.log(`[orca-dev-install] ${step.label}`)
    const result = spawnSync(step.command, step.args, {
      cwd: step.cwd,
      env: { ...process.env, ...step.env },
      stdio: 'inherit'
    })
    if (result.status !== 0) {
      console.error(`[orca-dev-install] ${step.label} failed; ${appPath} was not touched`)
      return 1
    }
  }
  const builtAppPath = join(
    source.checkoutPath,
    'dist',
    'mac-arm64',
    `${ORCA_DEV_IDENTITY.productName}.app`
  )
  const swap = await swapOrcaDevApp({
    builtAppPath,
    appPath,
    markerPath,
    commit: source.commit,
    ops: createMacSwapOps({ bundleId: ORCA_DEV_IDENTITY.appId })
  })
  const seconds = Math.round((performance.now() - startedAt) / 1000)
  console.log(`[orca-dev-install] ${swap.kind}: ${source.label} @ ${source.commit} in ${seconds}s`)
  if (swap.kind === 'rolled-back') {
    console.error(`[orca-dev-install] ${swap.reason}; previous app restored: ${swap.restored}`)
  } else if (swap.kind === 'quit-refused') {
    console.error('[orca-dev-install] Orca Dev did not quit; quit it and run again')
  }
  return swap.kind === 'installed' ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[orca-dev-install] ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  )
}
