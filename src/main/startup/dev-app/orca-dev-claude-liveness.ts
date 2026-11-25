import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ClaudeManagedAccount } from '../../../shared/agent-accounts/managed-account-types'
import { getAppEnvironment } from '../../../shared/app-lifecycle/app-environment'
import { resolveAbsoluteDirOverride } from '../../../shared/file-access/absolute-dir-override'
import type { GlobalSettings } from '../../../shared/settings/global-settings-types'
import { listClaudeProfileHomesAsync } from '../../claude-accounts/profiles/claude-profile-homes'
import { readUserClaudeConfigDir } from '../../claude-accounts/profiles/claude-profile-paths'
import { isProcessAlive } from '../../daemon/endpoint/identity/daemon-process-inspection'
import { isRecord } from '../../persistence/profile-state/documents/profile-state-document-validation'
import { getOrcaDevAppUserDataPath, getOrcaProdUserDataPath } from './orca-dev-app-paths'

// Claude writes sessions/<pid>.json while it runs; sibling <pid>.<hash>.key files are peer tokens.
const REGISTRY_FILE_NAME = /^\d+\.json$/

/** Where a user's own Claude home is configured; Dev's settings carry prod's synced accounts. */
export type ConfiguredClaudeHomes = {
  env?: NodeJS.ProcessEnv
  settings?: Pick<GlobalSettings, 'agentDefaultEnv'> & {
    claudeManagedAccounts?: readonly Pick<
      ClaudeManagedAccount,
      'managedAuthPath' | 'managedAuthRuntime'
    >[]
  }
}

/** Prod's and Dev's profile homes, configured custom homes, then the default one. */
export async function listOrcaDevClaudeHomes(
  appDataPath: string,
  userHome: string,
  configured: ConfiguredClaudeHomes = {}
): Promise<string[]> {
  const [prodHomes, devHomes] = await Promise.all([
    listClaudeProfileHomesAsync(getOrcaProdUserDataPath(appDataPath)),
    listClaudeProfileHomesAsync(getOrcaDevAppUserDataPath(appDataPath))
  ])
  const custom = configuredClaudeHomes(configured)
  return [...new Set([...prodHomes, ...devHomes, ...custom, join(userHome, '.claude')])]
}

function configuredClaudeHomes({ env = {}, settings }: ConfiguredClaudeHomes): string[] {
  // A WSL account's home lives in the guest, where no Mac process registers.
  const accountHomes = (settings?.claudeManagedAccounts ?? [])
    .filter((account) => account.managedAuthRuntime !== 'wsl')
    .map((account) => account.managedAuthPath)
  const candidates = [
    readUserClaudeConfigDir(env),
    settings?.agentDefaultEnv?.claude?.CLAUDE_CONFIG_DIR,
    ...accountHomes
  ]
  return candidates.map((home) => resolveAbsoluteDirOverride(home, '')).filter(Boolean)
}

/** A reused pid only costs a needless fork, never a second writer. */
export async function isClaudeSessionLive(
  sessionId: string,
  homes: readonly string[],
  isPidAlive: (pid: number) => boolean = isProcessAlive
): Promise<boolean> {
  const verdicts = await Promise.all(
    homes.map((home) => homeRunsSession(join(home, 'sessions'), sessionId, isPidAlive))
  )
  return verdicts.includes(true)
}

export async function isClaudeSessionLiveOnThisMac(
  sessionId: string,
  settings?: ConfiguredClaudeHomes['settings']
): Promise<boolean> {
  const appDataPath = getAppEnvironment().getPath('appData')
  const homes = await listOrcaDevClaudeHomes(appDataPath, homedir(), {
    env: process.env,
    settings
  })
  return isClaudeSessionLive(sessionId, homes)
}

async function homeRunsSession(
  registryDir: string,
  sessionId: string,
  isPidAlive: (pid: number) => boolean
): Promise<boolean> {
  const names = await readdir(registryDir).catch(() => [])
  const pids = await Promise.all(
    names
      .filter((name) => REGISTRY_FILE_NAME.test(name))
      .map((name) => registeredPid(join(registryDir, name), sessionId))
  )
  return pids.some((pid) => pid !== null && isPidAlive(pid))
}

async function registeredPid(registryFile: string, sessionId: string): Promise<number | null> {
  try {
    const entry: unknown = JSON.parse(await readFile(registryFile, 'utf8'))
    return isRecord(entry) &&
      entry.sessionId === sessionId &&
      typeof entry.pid === 'number' &&
      Number.isInteger(entry.pid) &&
      entry.pid > 0
      ? entry.pid
      : null
  } catch {
    // A file Claude is rewriting or removing names no live session.
    return null
  }
}
