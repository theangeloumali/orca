import { createContext } from 'react'
import type React from 'react'
import type { Repo } from '../../../../../../shared/repository/repo-types'

/** Stable for the list's lifetime, so memoized header menus never re-render on selection changes. */
export type ProjectHeaderSelectionActions = {
  /** Click or Enter/Space on a header: modifier gestures select, a plain one clears. */
  handleHeaderGestureCapture: (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    repo: Repo
  ) => void
  /** The selection a header's menu acts on: all of it when the header is part of a 2+ selection. */
  getMenuSelection: (repo: Repo) => readonly Repo[] | null
  clearSelection: () => void
  groupInto: (repos: readonly Repo[], groupId: string) => void
  createGroupFrom: (repos: readonly Repo[]) => void
}

export type ProjectHeaderSelectionState = {
  selectedKeys: ReadonlySet<string>
  /** In the order they were picked; the first decides which machine a new group lives on. */
  selectedRepos: readonly Repo[]
  /** False while the list is not grouped by project, or has no project headers. */
  selectable: boolean
}

export const ProjectHeaderSelectionActionsContext =
  createContext<ProjectHeaderSelectionActions | null>(null)

export const ProjectHeaderSelectionStateContext = createContext<ProjectHeaderSelectionState>({
  selectedKeys: new Set(),
  selectedRepos: [],
  selectable: false
})
