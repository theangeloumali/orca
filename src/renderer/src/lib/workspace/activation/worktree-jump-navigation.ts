import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store/index'
import { activateAndRevealWorkspace } from '@/lib/workspace/activation/worktree-activation'
import { getVisibleWorktreeShortcutTargets } from '@/components/sidebar/worktree-list/listing/visible-worktrees'
import { worktreePassesSidebarFilters } from '@/components/sidebar/worktree-list/listing/worktree-filter-visibility'
import {
  sidebarFindIsActive,
  sidebarHasActiveFilters
} from '@/components/sidebar/worktree-list/controls/sidebar-filter-actions'
import { parseWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'
import {
  normalizeExecutionHostId,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'

function wasHiddenBySidebarFilters(
  worktreeId: string,
  executionHostId?: ExecutionHostId,
  options?: { ignoreFind?: boolean }
): boolean {
  const state = useAppStore.getState()
  // Some lightweight callers/tests provide only the activation slice of state.
  if (!selectWorktreesByRepo(state) || !sidebarHasActiveFilters(state)) {
    return false
  }

  const inRenderedTargets = getVisibleWorktreeShortcutTargets().some((target) => {
    if (target.id !== worktreeId) {
      return false
    }
    if (!executionHostId) {
      return true
    }
    // Legacy hostless rows cannot vouch for remote twins or navigation clears filters instead of warning.
    if (!target.executionHostId) {
      return false
    }
    return (
      normalizeExecutionHostId(target.executionHostId) === normalizeExecutionHostId(executionHostId)
    )
  })
  if (inRenderedTargets) {
    return false
  }
  // Deleted worktrees fail every filter; verify existence before blaming active filters.
  if (!state.getKnownWorktreeById?.(worktreeId, executionHostId)) {
    return false
  }
  // Collapsed unfiltered targets need reveal, not a toast. Require host identity so an unfiltered twin cannot vouch for a filtered target.
  return !worktreePassesSidebarFilters(worktreeId, executionHostId, options)
}

// Find is a lookup, so a jump to a row only it hides clears it instead of warning.
function clearFindHidingOnly(worktreeId: string, executionHostId?: ExecutionHostId): void {
  const state = useAppStore.getState()
  if (!selectWorktreesByRepo(state) || !sidebarFindIsActive(state)) {
    return
  }
  if (
    wasHiddenBySidebarFilters(worktreeId, executionHostId) &&
    !wasHiddenBySidebarFilters(worktreeId, executionHostId, { ignoreFind: true })
  ) {
    state.setSidebarFindQuery('')
  }
}

/** Navigate from a worktree reference in either sidebar back to the workspace surface. */
export function jumpToWorktreeFromSidebar(
  worktreeId: string,
  options?: { executionHostId?: ExecutionHostId }
): boolean {
  // Folder workspaces aren't in the worktree filter pipeline; only git worktrees can be filter-hidden.
  const isFolder = parseWorkspaceKey(worktreeId)?.type === 'folder'
  if (!isFolder) {
    clearFindHidingOnly(worktreeId, options?.executionHostId)
  }
  const hiddenBeforeActivation =
    !isFolder && wasHiddenBySidebarFilters(worktreeId, options?.executionHostId)

  // Workspace dispatch owns folder/worktree routing and folder path-status guards.
  const activated = activateAndRevealWorkspace(worktreeId, {
    navigationIntent: 'user-open',
    showWorkspaceList: true,
    ...(hiddenBeforeActivation ? { revealInSidebar: false, clearSidebarFilters: false } : {}),
    ...(options?.executionHostId ? { executionHostId: options.executionHostId } : {})
  })
  if (activated === false) {
    return false
  }

  const hiddenAfterActivation =
    hiddenBeforeActivation && wasHiddenBySidebarFilters(worktreeId, options?.executionHostId)
  if (hiddenBeforeActivation && !hiddenAfterActivation) {
    // Activation can make Hide sleeping targets visible; reveal after that transition before blaming filters.
    useAppStore
      .getState()
      .revealWorktreeInSidebar(
        worktreeId,
        options?.executionHostId ? { executionHostId: options.executionHostId } : {}
      )
  }

  if (hiddenAfterActivation) {
    toast.warning(
      translate(
        'auto.lib.worktreeJumpNavigation.filteredNotice',
        'This worktree is hidden by sidebar filters. The workspace was opened, but it is not shown in Spaces.'
      )
    )
  }
  return true
}
