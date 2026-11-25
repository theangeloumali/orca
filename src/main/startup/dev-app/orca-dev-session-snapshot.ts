import { WORKSPACE_SESSION_DOMAINS } from '../../persistence/workspace-session-domains'
import {
  isSeededSessionField,
  isSessionField,
  withoutChatTabs,
  withoutPtyBindings
} from '../../persistence/moving-wsl-projects/terminal-state/wsl-move-session-rewrite'
import { INHERITED_ORCA_IDENTITY_ENV_KEYS } from '../../ipc/pty/host-env/inherited-orca-identity-env'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import {
  SEEDED_PROFILE_STATE_DOMAINS,
  pickSeededProfileStateDomains
} from '../../../shared/orca-profiles/seeded-profile-state-domains'
import { WORKSPACE_SESSION_FIELD_OWNERSHIP } from '../../../shared/workspace-session/workspace-session-host-field-ownership'
import { safeParseWorkspaceSession } from '../../../shared/workspace-session/workspace-session-schema'
import type { WorkspaceSessionState } from '../../../shared/workspace-session/workspace-session-state-types'

export const [ORCA_DEV_SESSION_DOMAIN] = WORKSPACE_SESSION_DOMAINS

/** Seeded domains plus prod's tabs and layouts; leases, live PTY ids and automations stay behind. */
export const ORCA_DEV_SYNCED_DOMAINS: readonly string[] = [
  ...SEEDED_PROFILE_STATE_DOMAINS,
  ORCA_DEV_SESSION_DOMAIN
]

export type OrcaDevSyncedDomains = {
  picked: Map<string, unknown>
  /** Domains Dev replaces; a missing or invalid prod session leaves Dev's own in place. */
  replaced: string[]
  /** Prod's session as imported, for the merge with Dev's own. */
  session: WorkspaceSessionState | null
}

export function pickOrcaDevSyncedDomains(prod: ReadonlyMap<string, unknown>): OrcaDevSyncedDomains {
  const picked = pickSeededProfileStateDomains(prod)
  const replaced = SEEDED_PROFILE_STATE_DOMAINS.filter((domain) => domain !== 'schemaVersion')
  const parsed = safeParseWorkspaceSession(prod.get(ORCA_DEV_SESSION_DOMAIN))
  if (!parsed?.success) {
    return { picked, replaced, session: null }
  }
  const session = withStoppedAgents(withoutLiveBindings(parsed.data))
  picked.set(ORCA_DEV_SESSION_DOMAIN, session)
  return { picked, replaced: [...replaced, ORCA_DEV_SESSION_DOMAIN], session }
}

/** Live PTYs, SSH reconnects, host intents and fences belong to prod's processes; chats to its journal. */
function withoutLiveBindings(session: WorkspaceSessionState): WorkspaceSessionState {
  const {
    activeConnectionIdsAtShutdown: _connections,
    clientHostedBrowserCloseIntentsByEnvironment: _browserCloses,
    pairedTerminalTabCloseIntentsByEnvironment: _terminalCloses,
    // Both fence prod's PTY ids, which their schemas require; without them they fence nothing.
    terminalSurfaceTombstonesByPaneKey: _surfaceTombstones,
    closedTerminalPanesByPaneKey: _closedPanes,
    ...rest
  } = withoutChatTabs(withoutPtyBindings(session))
  return withoutHostFields(rest)
}

/** Host fences and restart hints: the fields a WSL seed also leaves with their own host. */
function withoutHostFields(session: WorkspaceSessionState): WorkspaceSessionState {
  const kept = { ...session }
  for (const field of Object.keys(kept)) {
    const global = isSessionField(field) && WORKSPACE_SESSION_FIELD_OWNERSHIP[field] === 'global'
    if (isSessionField(field) && !global && !isSeededSessionField(field)) {
      Reflect.deleteProperty(kept, field)
    }
  }
  return kept
}

// A pane's terminal, hook channel and agent team name prod's processes, never Dev's.
const PROD_IDENTITY_ENV_KEYS: ReadonlySet<string> = new Set([
  ...INHERITED_ORCA_IDENTITY_ENV_KEYS,
  'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'
])

function isProdIdentityEnvKey(key: string): boolean {
  return key.startsWith('ORCA_') || PROD_IDENTITY_ENV_KEYS.has(key)
}

/** The pane-owned capture form (#11598): it resumes only when the user opens the tab, as a fork. */
function stoppedRecord(record: SleepingAgentSessionRecord): SleepingAgentSessionRecord {
  const launchConfig = record.launchConfig && {
    ...record.launchConfig,
    agentEnv: Object.fromEntries(
      Object.entries(record.launchConfig.agentEnv).filter(([key]) => !isProdIdentityEnvKey(key))
    )
  }
  return {
    ...record,
    ...(launchConfig ? { launchConfig } : {}),
    origin: 'worktree-sleep',
    state: 'done',
    restoreOnTabOpenOnly: true,
    importedFromProd: true
  }
}

function withStoppedAgents(session: WorkspaceSessionState): WorkspaceSessionState {
  const records = session.sleepingAgentSessionsByPaneKey
  if (!records) {
    return session
  }
  // Remote panes reconnect only through the SSH lease prod holds.
  const local = Object.entries(records).filter(([, record]) => !record.connectionId)
  return {
    ...session,
    sleepingAgentSessionsByPaneKey: Object.fromEntries(
      local.map(([paneKey, record]) => [paneKey, stoppedRecord(record)])
    )
  }
}
