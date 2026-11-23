import React, { useMemo } from 'react'
import type { GroupHeaderRow } from '../../../../../../shared/sidebar-list/row-types'
import { RepoScanUnavailableIndicator } from './RepoScanUnavailableIndicator'
import { AgentActivityBadges } from './AgentActivityBadges'
import { getHeaderWorkspaceScope, useProjectActivityCounts } from './use-project-activity-counts'

function HeaderActivityBadges({ row }: { row: GroupHeaderRow }): React.JSX.Element | null {
  const { hostId, hostWorktreeIds, worktreeIds } = row
  // Keyed on the row's id arrays so the store selector sees a stable scope between plans.
  const scope = useMemo(
    () => getHeaderWorkspaceScope({ hostId, hostWorktreeIds, worktreeIds }),
    [hostId, hostWorktreeIds, worktreeIds]
  )
  return <AgentActivityBadges {...useProjectActivityCounts(scope)} />
}

/** A repo header's title-row extras: the scan warning, then live activity for the workspaces it draws. */
export function RepoHeaderTitleExtras({ row }: { row: GroupHeaderRow }): React.JSX.Element {
  return (
    <>
      {row.repo ? <RepoScanUnavailableIndicator repo={row.repo} /> : null}
      <HeaderActivityBadges row={row} />
    </>
  )
}
