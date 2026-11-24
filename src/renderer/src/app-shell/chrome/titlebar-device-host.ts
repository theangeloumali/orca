import type { Repo } from '../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { getWorktreeExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { resolveHostColor } from '../../../../shared/execution-host/host-appearance'
import type { SidebarDrawnHosts } from '@/components/sidebar/worktree-list/rows/sidebar-drawn-hosts'

type ActiveWorkspace = {
  worktree: Pick<Worktree, 'hostId'>
  repo: Pick<Repo, 'connectionId' | 'executionHostId'> | undefined
}

type TitlebarDevice = { host: SidebarDrawnHosts['hosts'][number]; color: string | null }

/** The active workspace's host and color by the sidebar's own rule and order; null when nothing to tell apart. */
export function resolveTitlebarDevice(
  active: ActiveWorkspace | null,
  drawn: SidebarDrawnHosts | null,
  settings: Pick<GlobalSettings, 'hostSettingOverrides'> | null | undefined
): TitlebarDevice | null {
  if (!active || !drawn || drawn.hosts.length < 2) {
    return null
  }
  const hostId = getWorktreeExecutionHostId(active.worktree, active.repo, drawn.defaultHostId)
  const host = drawn.hosts.find((option) => option.id === hostId)
  if (!host) {
    return null
  }
  const orderedHostIds = drawn.hosts.map((option) => option.id)
  return { host, color: resolveHostColor(settings, host.id, orderedHostIds) }
}
