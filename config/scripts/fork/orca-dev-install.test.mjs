import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createBuildSteps,
  parseInstallArgs,
  pnpmSpecFromPackageManager,
  prepareBuildCheckout,
  prepareSourceAndReadPnpm,
  resolveBuildSource
} from './orca-dev-install.mjs'

const MAIN = '/repo/orca'
const BUILD_WORKTREE = join(MAIN, '.claude', 'worktrees', 'dev-app-build')
const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)

/** Fake git keyed by "cwd: args"; a missing key fails like a non-zero git exit. */
function fakeGit(responses) {
  const calls = []
  const git = (cwd, args) => {
    const key = `${cwd}: ${args.join(' ')}`
    calls.push(key)
    return key in responses ? { ok: true, out: responses[key] } : { ok: false, out: '' }
  }
  return { git, calls }
}

const noDirectories = () => false
// Fake checkouts have no real paths to resolve.
const realpath = (path) => path

describe('parseInstallArgs', () => {
  it('defaults to the main checkout without a dry run', () => {
    expect(parseInstallArgs([])).toEqual({ target: null, dryRun: false })
  })

  it('reads one branch or path and --dry-run in any order', () => {
    expect(parseInstallArgs(['--dry-run', 'main'])).toEqual({ target: 'main', dryRun: true })
    expect(parseInstallArgs(['feat/x', '--dry-run'])).toEqual({ target: 'feat/x', dryRun: true })
  })

  it('refuses unknown flags and a second target', () => {
    expect(() => parseInstallArgs(['--force'])).toThrow(/Unknown option/)
    expect(() => parseInstallArgs(['a', 'b'])).toThrow(/one branch or path/)
  })
})

describe('resolveBuildSource', () => {
  it('builds the clean main checkout by default', () => {
    const { git } = fakeGit({
      [`${MAIN}: rev-parse --show-toplevel`]: MAIN,
      [`${MAIN}: status --porcelain`]: '',
      [`${MAIN}: rev-parse HEAD`]: SHA_A,
      [`${MAIN}: rev-parse --abbrev-ref HEAD`]: 'angelo/daily'
    })
    const source = resolveBuildSource({
      target: null,
      mainCheckout: MAIN,
      isDirectory: noDirectories,
      git,
      realpath,
      fetch: false
    })
    expect(source).toEqual({
      kind: 'default',
      label: 'angelo/daily',
      checkoutPath: MAIN,
      commit: SHA_A
    })
  })

  it('refuses a dirty checkout, whose build would not match its commit', () => {
    const { git } = fakeGit({
      [`${MAIN}: rev-parse --show-toplevel`]: MAIN,
      [`${MAIN}: status --porcelain`]: ' M src/a.ts'
    })
    expect(() =>
      resolveBuildSource({
        target: null,
        mainCheckout: MAIN,
        isDirectory: noDirectories,
        git,
        realpath,
        fetch: false
      })
    ).toThrow(/uncommitted changes/)
  })

  it('builds an existing clean worktree path in place', () => {
    const path = '/repo/orca/.claude/worktrees/other'
    const { git } = fakeGit({
      [`${path}: rev-parse --show-toplevel`]: path,
      [`${path}: status --porcelain`]: '',
      [`${path}: rev-parse HEAD`]: SHA_B,
      [`${path}: rev-parse --abbrev-ref HEAD`]: 'feat/other'
    })
    const source = resolveBuildSource({
      target: path,
      mainCheckout: MAIN,
      isDirectory: (p) => p === path,
      git,
      realpath,
      fetch: false
    })
    expect(source).toEqual({ kind: 'path', label: 'feat/other', checkoutPath: path, commit: SHA_B })
  })

  it('refuses a directory that is not a git checkout', () => {
    const { git } = fakeGit({})
    expect(() =>
      resolveBuildSource({
        target: '/tmp/x',
        mainCheckout: MAIN,
        isDirectory: () => true,
        git,
        realpath,
        fetch: false
      })
    ).toThrow(/not a git checkout/)
  })

  it('fetches a branch and prefers the freshly fetched remote ref', () => {
    const { git, calls } = fakeGit({
      [`${MAIN}: check-ref-format --branch feat/x`]: 'feat/x',
      [`${MAIN}: fetch origin feat/x`]: '',
      [`${MAIN}: rev-parse --verify --quiet refs/remotes/origin/feat/x^{commit}`]: SHA_B,
      [`${MAIN}: rev-parse --verify --quiet refs/heads/feat/x^{commit}`]: SHA_A
    })
    const source = resolveBuildSource({
      target: 'feat/x',
      mainCheckout: MAIN,
      isDirectory: noDirectories,
      git,
      realpath,
      fetch: true
    })
    expect(source).toEqual({
      kind: 'branch',
      label: 'feat/x',
      checkoutPath: BUILD_WORKTREE,
      commit: SHA_B
    })
    expect(calls).toContain(`${MAIN}: fetch origin feat/x`)
  })

  it('keeps unpushed local commits when the local branch is ahead of origin', () => {
    const { git } = fakeGit({
      [`${MAIN}: check-ref-format --branch feat/x`]: 'feat/x',
      [`${MAIN}: fetch origin feat/x`]: '',
      [`${MAIN}: rev-parse --verify --quiet refs/remotes/origin/feat/x^{commit}`]: SHA_B,
      [`${MAIN}: rev-parse --verify --quiet refs/heads/feat/x^{commit}`]: SHA_A,
      [`${MAIN}: merge-base --is-ancestor ${SHA_B} ${SHA_A}`]: ''
    })
    const source = resolveBuildSource({
      target: 'feat/x',
      mainCheckout: MAIN,
      isDirectory: noDirectories,
      git,
      realpath,
      fetch: true
    })
    expect(source.commit).toBe(SHA_A)
  })

  it('falls back to a local-only branch, and never fetches on a dry run', () => {
    const { git, calls } = fakeGit({
      [`${MAIN}: check-ref-format --branch local-only`]: 'local-only',
      [`${MAIN}: rev-parse --verify --quiet refs/heads/local-only^{commit}`]: SHA_A
    })
    const source = resolveBuildSource({
      target: 'local-only',
      mainCheckout: MAIN,
      isDirectory: noDirectories,
      git,
      realpath,
      fetch: false
    })
    expect(source.commit).toBe(SHA_A)
    expect(calls.some((call) => call.includes('fetch'))).toBe(false)
  })

  it('names a branch that exists neither locally nor on origin', () => {
    const { git } = fakeGit({ [`${MAIN}: check-ref-format --branch nope`]: 'nope' })
    expect(() =>
      resolveBuildSource({
        target: 'nope',
        mainCheckout: MAIN,
        isDirectory: noDirectories,
        git,
        realpath,
        fetch: true
      })
    ).toThrow(/No branch "nope"/)
  })

  it('refuses option-shaped and malformed branch names before git sees them', () => {
    const { git, calls } = fakeGit({})
    expect(() =>
      resolveBuildSource({
        target: '--upload-pack=x',
        mainCheckout: MAIN,
        isDirectory: noDirectories,
        git,
        realpath,
        fetch: true
      })
    ).toThrow(/Not a valid branch/)
    expect(() =>
      resolveBuildSource({
        target: 'a..b',
        mainCheckout: MAIN,
        isDirectory: noDirectories,
        git,
        realpath,
        fetch: true
      })
    ).toThrow(/Not a valid branch/)
    expect(calls.some((call) => call.includes('fetch'))).toBe(false)
  })
})

describe('prepareBuildCheckout', () => {
  const branchSource = {
    kind: 'branch',
    label: 'feat/x',
    checkoutPath: BUILD_WORKTREE,
    commit: SHA_B
  }

  it('adds the build worktree detached, so a branch checked out elsewhere still builds', () => {
    const { git, calls } = fakeGit({
      [`${MAIN}: worktree add --detach ${BUILD_WORKTREE} ${SHA_B}`]: ''
    })
    prepareBuildCheckout({
      source: branchSource,
      mainCheckout: MAIN,
      isDirectory: noDirectories,
      git,
      realpath
    })
    expect(calls).toEqual([`${MAIN}: worktree add --detach ${BUILD_WORKTREE} ${SHA_B}`])
  })

  it('moves an existing clean build worktree to the commit', () => {
    const { git, calls } = fakeGit({
      [`${BUILD_WORKTREE}: rev-parse --show-toplevel`]: BUILD_WORKTREE,
      [`${BUILD_WORKTREE}: status --porcelain`]: '',
      [`${BUILD_WORKTREE}: checkout --detach ${SHA_B}`]: ''
    })
    prepareBuildCheckout({
      source: branchSource,
      mainCheckout: MAIN,
      isDirectory: () => true,
      git,
      realpath
    })
    expect(calls).toContain(`${BUILD_WORKTREE}: checkout --detach ${SHA_B}`)
  })

  it('refuses a dirty build worktree instead of discarding its changes', () => {
    const { git } = fakeGit({
      [`${BUILD_WORKTREE}: rev-parse --show-toplevel`]: BUILD_WORKTREE,
      [`${BUILD_WORKTREE}: status --porcelain`]: '?? notes.txt'
    })
    expect(() =>
      prepareBuildCheckout({
        source: branchSource,
        mainCheckout: MAIN,
        isDirectory: () => true,
        git,
        realpath
      })
    ).toThrow(/uncommitted changes/)
  })

  it('refuses a path argument inside a checkout, which git would resolve to its parent', () => {
    const subdir = join(MAIN, 'src')
    const { git, calls } = fakeGit({ [`${subdir}: rev-parse --show-toplevel`]: MAIN })
    expect(() =>
      resolveBuildSource({
        target: subdir,
        mainCheckout: MAIN,
        isDirectory: (p) => p === subdir,
        git,
        realpath,
        fetch: false
      })
    ).toThrow(/not a git checkout root/)
    expect(calls.some((call) => call.includes('status'))).toBe(false)
  })

  it('never detaches the main checkout through a plain directory at dev-app-build', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'orca-dev-install-')))
    const runGit = (cwd, args) => {
      const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
      return { ok: result.status === 0, out: (result.stdout ?? '').trim() }
    }
    try {
      const main = join(root, 'orca')
      mkdirSync(main)
      for (const args of [
        ['init', '-q', '-b', 'main'],
        ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'a']
      ]) {
        runGit(main, args)
      }
      const plainDir = join(main, '.claude', 'worktrees', 'dev-app-build')
      mkdirSync(plainDir, { recursive: true })
      const commit = runGit(main, ['rev-parse', 'HEAD']).out
      const source = { kind: 'branch', label: 'main', checkoutPath: plainDir, commit }
      expect(() =>
        prepareBuildCheckout({
          source,
          mainCheckout: main,
          isDirectory: () => true,
          git: runGit,
          realpath: realpathSync
        })
      ).toThrow(/not a git checkout root/)
      expect(runGit(main, ['symbolic-ref', '--short', 'HEAD']).out).toBe('main')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('leaves default and path checkouts as they are', () => {
    const { git, calls } = fakeGit({})
    prepareBuildCheckout({
      source: { kind: 'path', label: 'x', checkoutPath: '/p', commit: SHA_A },
      mainCheckout: MAIN,
      isDirectory: () => true,
      git,
      realpath
    })
    expect(calls).toEqual([])
  })
})

describe('createBuildSteps', () => {
  const steps = createBuildSteps({ checkoutPath: '/p', pnpmSpec: 'pnpm@12.18.0' })

  it('installs from the lockfile first and packages an arm64 app folder last', () => {
    expect(steps[0].args).toEqual(['-y', 'pnpm@12.18.0', 'install', '--frozen-lockfile'])
    expect(steps.at(-1).args).toEqual([
      '-y',
      'pnpm@12.18.0',
      'exec',
      'electron-builder',
      '--config',
      'config/electron-builder.config.cjs',
      '--mac',
      'dir',
      '--arm64'
    ])
  })

  it('builds every step in the checkout with the Orca Dev flag set', () => {
    for (const step of steps) {
      expect(step).toMatchObject({ command: 'npx', cwd: '/p', env: { ORCA_FORK_DEV_APP: '1' } })
    }
    expect(steps.map((step) => step.args[3])).toContain('build:desktop')
  })

  it('reads the pinned pnpm version without its integrity hash', () => {
    expect(pnpmSpecFromPackageManager('pnpm@12.18.0+sha512.abc')).toBe('pnpm@12.18.0')
    expect(() => pnpmSpecFromPackageManager('yarn@4')).toThrow(/pnpm/)
  })
})

describe('prepareSourceAndReadPnpm', () => {
  it("checks out the target commit before reading that commit's pinned pnpm", () => {
    const { git, calls } = fakeGit({
      [`${MAIN}: worktree add --detach ${BUILD_WORKTREE} ${SHA_B}`]: ''
    })
    const pnpmSpec = prepareSourceAndReadPnpm({
      source: { kind: 'branch', label: 'feat/x', checkoutPath: BUILD_WORKTREE, commit: SHA_B },
      mainCheckout: MAIN,
      dryRun: false,
      isDirectory: noDirectories,
      git,
      realpath,
      readPackageManager: (path) => {
        calls.push(`read ${path}`)
        return 'pnpm@12.18.0'
      }
    })
    expect(pnpmSpec).toBe('pnpm@12.18.0')
    expect(calls).toEqual([
      `${MAIN}: worktree add --detach ${BUILD_WORKTREE} ${SHA_B}`,
      `read ${join(BUILD_WORKTREE, 'package.json')}`
    ])
  })

  it('reads the main checkout on a dry run, which never creates the build worktree', () => {
    const { git, calls } = fakeGit({})
    prepareSourceAndReadPnpm({
      source: { kind: 'branch', label: 'feat/x', checkoutPath: BUILD_WORKTREE, commit: SHA_B },
      mainCheckout: MAIN,
      dryRun: true,
      isDirectory: noDirectories,
      git,
      realpath,
      readPackageManager: (path) => {
        calls.push(`read ${path}`)
        return 'pnpm@12.18.0'
      }
    })
    expect(calls).toEqual([`read ${join(MAIN, 'package.json')}`])
  })
})
