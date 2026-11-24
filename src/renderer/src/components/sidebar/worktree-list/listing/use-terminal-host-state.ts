import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import type { TerminalHostState } from './live-terminal-on-host'

/** The store fields Live reads to place each PTY on its machine. */
export function useTerminalHostState(): TerminalHostState {
  return useAppStore(
    useShallow((s) => ({
      repos: s.repos,
      worktreesByRepo: selectWorktreesByRepo(s),
      folderWorkspaces: selectFolderWorkspaces(s),
      projectGroups: s.projectGroups,
      wslHostStatuses: s.wslHostStatuses
    }))
  )
}
