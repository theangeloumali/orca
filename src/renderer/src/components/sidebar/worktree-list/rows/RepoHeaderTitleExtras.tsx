import React from 'react'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { RepoScanUnavailableIndicator } from './RepoScanUnavailableIndicator'
import { AgentActivityBadges } from './AgentActivityBadges'
import { useProjectActivityCounts } from './use-project-activity-counts'

function RepoActivityBadges({ repo }: { repo: Repo }): React.JSX.Element | null {
  const counts = useProjectActivityCounts(repo)
  return <AgentActivityBadges {...counts} />
}

/** A repo header's title-row extras: the scan warning, then live activity for this registration. */
export function RepoHeaderTitleExtras({ repo }: { repo: Repo }): React.JSX.Element {
  return (
    <>
      <RepoScanUnavailableIndicator repo={repo} />
      <RepoActivityBadges repo={repo} />
    </>
  )
}
