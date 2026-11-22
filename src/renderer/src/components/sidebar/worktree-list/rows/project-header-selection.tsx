import React, { use } from 'react'
import { cn } from '@/lib/class-names'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { GroupHeaderRow } from '../../../../../../shared/sidebar-list/row-types'
import { ProjectHeaderHostTooltip } from './ProjectHeaderHostLabel'
import { ProjectSelectionBar } from '../controls/ProjectSelectionBar'
import {
  ProjectHeaderSelectionActionsContext,
  ProjectHeaderSelectionStateContext
} from './project-header-selection-context'
import { useProjectHeaderSelection } from './use-project-header-selection'

type ScopeProps = Parameters<typeof useProjectHeaderSelection>[0] & { children: React.ReactNode }

/** Owns project-header multi-select for the list below it and draws its "N selected" bar. */
export function ProjectHeaderSelectionScope({ children, ...args }: ScopeProps): React.JSX.Element {
  const { scopeRef, actions, state } = useProjectHeaderSelection(args)
  return (
    <ProjectHeaderSelectionActionsContext value={actions}>
      <ProjectHeaderSelectionStateContext value={state}>
        {/* contents: the list keeps its layout; the element only bounds "click outside clears". */}
        <div ref={scopeRef} className="contents">
          <ProjectSelectionBar />
          {children}
        </div>
      </ProjectHeaderSelectionStateContext>
    </ProjectHeaderSelectionActionsContext>
  )
}

export function ProjectHeaderSelectionTarget({
  repo,
  children
}: {
  repo: Repo | undefined
  children: React.ReactNode
}): React.JSX.Element {
  const actions = use(ProjectHeaderSelectionActionsContext)
  const { selectedKeys } = use(ProjectHeaderSelectionStateContext)
  if (!repo || !actions) {
    return <>{children}</>
  }
  const selected = selectedKeys.has(getRepoRowIdentity(repo))
  return (
    <div
      data-project-header-selected={selected ? '' : undefined}
      className={cn(
        'rounded-md',
        // Mirrors the selected workspace card so both lists read as one selection language.
        selected && 'bg-worktree-sidebar-accent/70 ring-1 ring-worktree-sidebar-ring/35'
      )}
      onClickCapture={(event) => actions.handleHeaderClickCapture(event, repo)}
    >
      {children}
    </div>
  )
}

/** A section header row: project headers outside a group join the selection, others render as before. */
export function SelectableProjectHeader({
  row,
  children,
  ...tooltip
}: React.ComponentProps<typeof ProjectHeaderHostTooltip> & {
  row: GroupHeaderRow
}): React.JSX.Element {
  return (
    <ProjectHeaderSelectionTarget repo={row.projectGroup ? undefined : row.repo}>
      <ProjectHeaderHostTooltip {...tooltip}>{children}</ProjectHeaderHostTooltip>
    </ProjectHeaderSelectionTarget>
  )
}
