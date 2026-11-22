import React, { use } from 'react'
import * as Slot from 'radix-ui/slot'
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
          {/* Zero-height anchor: the bar overlays the list top instead of pushing rows down. */}
          <div className="relative z-30 h-0 shrink-0">
            <ProjectSelectionBar />
          </div>
          {children}
        </div>
      </ProjectHeaderSelectionStateContext>
    </ProjectHeaderSelectionActionsContext>
  )
}

/** Whether the header is selected, or undefined while it cannot be selected at all. */
function useProjectHeaderSelected(repo: Repo | undefined): boolean | undefined {
  const actions = use(ProjectHeaderSelectionActionsContext)
  const { selectedKeys, selectable } = use(ProjectHeaderSelectionStateContext)
  return repo && actions && selectable ? selectedKeys.has(getRepoRowIdentity(repo)) : undefined
}

export function ProjectHeaderSelectionTarget({
  repo,
  children
}: {
  repo: Repo | undefined
  children: React.ReactNode
}): React.JSX.Element {
  const actions = use(ProjectHeaderSelectionActionsContext)
  const selected = useProjectHeaderSelected(repo)
  if (!repo || !actions || selected === undefined) {
    return <>{children}</>
  }
  return (
    <div
      data-project-header-selected={selected ? '' : undefined}
      className={cn(
        'rounded-md',
        // Mirrors the selected workspace card so both lists read as one selection language.
        selected && 'bg-worktree-sidebar-accent/70 ring-1 ring-worktree-sidebar-ring/35'
      )}
      onClickCapture={(event) => actions.handleHeaderGestureCapture(event, repo)}
      onKeyDownCapture={(event) => actions.handleHeaderGestureCapture(event, repo)}
    >
      {children}
    </div>
  )
}

/** A section header row: every project header, inside a group or not, joins the selection; group headers do not. */
export function SelectableProjectHeader({
  row,
  children,
  ...tooltip
}: React.ComponentProps<typeof ProjectHeaderHostTooltip> & {
  row: GroupHeaderRow
}): React.JSX.Element {
  const repo = row.projectGroup ? undefined : row.repo
  const pressed = useProjectHeaderSelected(repo)
  return (
    <ProjectHeaderSelectionTarget repo={repo}>
      <ProjectHeaderHostTooltip {...tooltip}>
        <Slot.Root aria-pressed={pressed}>{children}</Slot.Root>
      </ProjectHeaderHostTooltip>
    </ProjectHeaderSelectionTarget>
  )
}
