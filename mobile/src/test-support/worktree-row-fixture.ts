import type {
  WorkspaceListItem,
  Worktree,
  WorktreeRowView
} from '../worktree/workspace-list/workspace-list-types'

/** A host row with every always-sent field filled, for list tests that care about a few. */
export function worktreeRow(overrides: Partial<Worktree> = {}): Worktree {
  return {
    workspaceKind: 'git',
    worktreeId: 'wt',
    repoId: 'repo-1',
    repo: 'orca',
    branch: 'feature',
    displayName: 'wt',
    path: '/tmp/wt',
    liveTerminalCount: 0,
    hasAttachedPty: false,
    unread: false,
    isPinned: false,
    linkedPR: null,
    status: 'inactive',
    agents: [],
    ...overrides
  }
}

export function listItem(row: Worktree, view: WorktreeRowView = {}): WorkspaceListItem {
  return { row, view }
}
