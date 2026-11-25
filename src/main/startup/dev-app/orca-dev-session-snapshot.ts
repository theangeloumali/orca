import {
  withoutChatTabs,
  withoutPtyBindings
} from '../../persistence/moving-wsl-projects/terminal-state/wsl-move-session-rewrite'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import {
  SEEDED_PROFILE_STATE_DOMAINS,
  pickSeededProfileStateDomains
} from '../../../shared/orca-profiles/seeded-profile-state-domains'
import { safeParseWorkspaceSession } from '../../../shared/workspace-session/workspace-session-schema'
import type { WorkspaceSessionState } from '../../../shared/workspace-session/workspace-session-state-types'

const SESSION_DOMAIN = 'workspaceSession'

/** Seeded domains plus prod's tabs and layouts; leases, live PTY ids and automations stay behind. */
export const ORCA_DEV_SYNCED_DOMAINS: readonly string[] = [
  ...SEEDED_PROFILE_STATE_DOMAINS,
  SESSION_DOMAIN
]

export type OrcaDevSyncedDomains = {
  picked: Map<string, unknown>
  /** Domains Dev replaces; a prod session that fails validation leaves Dev's own in place. */
  replaced: string[]
}

export function pickOrcaDevSyncedDomains(prod: ReadonlyMap<string, unknown>): OrcaDevSyncedDomains {
  const picked = pickSeededProfileStateDomains(prod)
  const replaced = SEEDED_PROFILE_STATE_DOMAINS.filter((domain) => domain !== 'schemaVersion')
  const rawSession = prod.get(SESSION_DOMAIN)
  if (rawSession === undefined) {
    return { picked, replaced: [...replaced, SESSION_DOMAIN] }
  }
  const parsed = safeParseWorkspaceSession(rawSession)
  if (!parsed?.success) {
    return { picked, replaced }
  }
  picked.set(SESSION_DOMAIN, withStoppedAgents(withoutLiveBindings(parsed.data)))
  return { picked, replaced: [...replaced, SESSION_DOMAIN] }
}

/** Live PTYs, SSH reconnects and host intents belong to prod's processes; native chats to its journal. */
function withoutLiveBindings(session: WorkspaceSessionState): WorkspaceSessionState {
  const {
    activeConnectionIdsAtShutdown: _connections,
    clientHostedBrowserCloseIntentsByEnvironment: _browserCloses,
    pairedTerminalTabCloseIntentsByEnvironment: _terminalCloses,
    localOnlyScrollbackByTabId: _scrollback,
    ...rest
  } = withoutChatTabs(withoutPtyBindings(session))
  return rest
}

/** The pane-owned capture form (#11598): it resumes only when the user opens the tab. */
function stoppedRecord(record: SleepingAgentSessionRecord): SleepingAgentSessionRecord {
  return { ...record, origin: 'worktree-sleep', state: 'done', restoreOnTabOpenOnly: true }
}

function withStoppedAgents(session: WorkspaceSessionState): WorkspaceSessionState {
  const records = session.sleepingAgentSessionsByPaneKey
  if (!records) {
    return session
  }
  return {
    ...session,
    sleepingAgentSessionsByPaneKey: Object.fromEntries(
      Object.entries(records).map(([paneKey, record]) => [paneKey, stoppedRecord(record)])
    )
  }
}
