import { shallow } from 'zustand/shallow'
import type { AppState } from '@/store/types'
import { getStructuredAgentSessionTabs } from '@/components/native-chat/session/status/structured-agent-session-tabs'
import type { WorktreeRuntimeOwnerState } from '@/lib/workspace/ownership/worktree-runtime-owner-state'
import {
  selectDetectedWorktreesByRepo,
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import type { Tab } from '../../../../../../shared/workspace-layout/tab-groups/tab-types'
import { getTerminalLeafPtyIds } from '../listing/visible-worktree-activity-inputs'

const chatTabCopies = new WeakMap<object, Tab[]>()
/** The chat list keeps its identity across terminal title writes; a stable copy fits the pane-host read. */
function chatTabsOf(state: AppState): Tab[] {
  const chats = getStructuredAgentSessionTabs(state.unifiedTabsByWorktree)
  let copy = chatTabCopies.get(chats)
  if (!copy) {
    copy = [...chats]
    chatTabCopies.set(chats, copy)
  }
  return copy
}

function ownerFields(state: AppState): Required<WorktreeRuntimeOwnerState> {
  return {
    repos: state.repos,
    settings: state.settings,
    worktreesByRepo: selectWorktreesByRepo(state),
    detectedWorktreesByRepo: selectDetectedWorktreesByRepo(state),
    folderWorkspaces: selectFolderWorkspaces(state),
    projectGroups: state.projectGroups,
    restoredRuntimeHostIdByWorkspaceSessionKey: state.restoredRuntimeHostIdByWorkspaceSessionKey,
    activeWorktreeId: state.activeWorktreeId,
    activeWorkspaceExecutionHostId: state.activeWorkspaceExecutionHostId,
    runtimeEnvironments: state.runtimeEnvironments,
    runtimeEnvironmentCatalogHydrated: state.runtimeEnvironmentCatalogHydrated,
    removedRuntimeEnvironmentIds: state.removedRuntimeEnvironmentIds
  }
}

/** Everything that decides which machine a pane or PTY runs on, and nothing a title write replaces. */
export function createPaneOwnershipProjection() {
  let previous: ReturnType<typeof project> | null = null
  function project(state: AppState) {
    return {
      ...ownerFields(state),
      unifiedTabsByWorktree: chatTabsOf(state),
      terminalLayoutsByTabId: getTerminalLeafPtyIds(state.terminalLayoutsByTabId),
      ptyIdsByTabId: state.ptyIdsByTabId
    }
  }
  return (state: AppState) => {
    const next = project(state)
    if (!previous || !shallow(previous, next)) {
      previous = next
    }
    return previous
  }
}
