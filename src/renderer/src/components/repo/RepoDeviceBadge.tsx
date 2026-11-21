import React from 'react'
import { WorktreeHostContextBadge } from '@/components/sidebar/workspace-card/host/WorktreeHostContextBadge'
import { useHostDisplayLabel } from '@/components/sidebar/worktree-list/controls/use-host-display-label'
import {
  getRepoExecutionHostId,
  isLocalExecutionHost
} from '../../../../shared/execution-host/execution-host'
import type { Repo } from '../../../../shared/repository/repo-types'

/** Names the machine of a project that is not on this computer; nothing for this computer's. */
export function RepoDeviceBadge({
  repo
}: {
  repo: Pick<Repo, 'connectionId' | 'executionHostId'>
}): React.JSX.Element | null {
  const hostId = getRepoExecutionHostId(repo)
  return isLocalExecutionHost(hostId) ? null : <RemoteDeviceBadge hostId={hostId} />
}

function RemoteDeviceBadge({ hostId }: { hostId: ReturnType<typeof getRepoExecutionHostId> }) {
  return <WorktreeHostContextBadge label={useHostDisplayLabel(hostId)} />
}
