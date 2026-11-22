import React from 'react'
import { FolderPathStatusIndicator } from './FolderPathStatusIndicator'
import { ProjectGroupFoldedSummary } from './project-group-header-actions'

/** A group header's title-row extras: its folder path status and, while folded, its counts. */
export function ProjectGroupTitleExtras({
  status,
  groupId
}: {
  status: React.ComponentProps<typeof FolderPathStatusIndicator>['status']
  groupId: string | undefined
}): React.JSX.Element {
  return (
    <>
      <FolderPathStatusIndicator status={status} />
      {groupId ? <ProjectGroupFoldedSummary groupId={groupId} /> : null}
    </>
  )
}
