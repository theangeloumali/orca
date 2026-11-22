import { describe, expect, it } from 'vitest'
import {
  activeWorkspaceRowFilterKeys,
  filterWorkspaceRows,
  NO_WORKSPACE_ROW_FILTERS,
  type WorkspaceRowFactReader
} from './workspace-row-filters'
import { filterWorktrees } from '../../../mobile/src/worktree/workspace-list/workspace-row-filtering'
import type { Worktree as PhoneWorktree } from '../../../mobile/src/worktree/workspace-list/workspace-list-types'

type Row = { id: string; needsYou: boolean; folder?: boolean }

const baseRead: WorkspaceRowFactReader<Row> = {
  isArchived: () => false,
  isInHiddenProject: () => false,
  isProjectHidden: () => false,
  isFolderWorkspace: (row) => row.folder === true,
  repoId: () => 'repo-1',
  hostId: () => 'local',
  isOtherClient: () => false,
  isDefaultBranch: () => false,
  isAutomationCreated: () => false,
  isCliCreated: () => false,
  isDetachedHead: () => false,
  isMainWorktree: () => false,
  isSleeping: () => false,
  hasRunningTerminal: () => false
}
const read: WorkspaceRowFactReader<Row> = { ...baseRead, needsYou: (row) => row.needsYou }

const needsYouOnly = { ...NO_WORKSPACE_ROW_FILTERS, showOnlyNeedsYou: true }
const rows: Row[] = [
  { id: 'waiting', needsYou: true },
  { id: 'busy', needsYou: false }
]
const ids = (list: Row[]): string[] => list.map((row) => row.id)

describe('showOnlyNeedsYou', () => {
  it('keeps only the rows whose agent waits on you', () => {
    expect(ids(filterWorkspaceRows(rows, needsYouOnly, read))).toEqual(['waiting'])
  })

  it('keeps every row when the reader has no needs-you fact', () => {
    expect(ids(filterWorkspaceRows(rows, needsYouOnly, baseRead))).toEqual(['waiting', 'busy'])
  })

  it('leaves folder workspaces to their own listing', () => {
    const folder = [{ id: 'folder', needsYou: false, folder: true }]
    expect(ids(filterWorkspaceRows(folder, needsYouOnly, read))).toEqual(['folder'])
  })

  it('keeps every row while off', () => {
    expect(ids(filterWorkspaceRows(rows, NO_WORKSPACE_ROW_FILTERS, read))).toEqual([
      'waiting',
      'busy'
    ])
  })

  it('counts as an active filter so Clear filters resets it', () => {
    expect(activeWorkspaceRowFilterKeys(needsYouOnly)).toEqual(['showOnlyNeedsYou'])
  })

  it('keeps phone rows, which carry no needs-you fact', () => {
    const phone: PhoneWorktree = {
      worktreeId: 'wt-1',
      repoId: 'repo-1',
      repo: 'repo',
      path: '/repo',
      branch: 'feature',
      displayName: 'feature',
      liveTerminalCount: 0,
      hasAttachedPty: false,
      unread: false,
      isPinned: false,
      linkedPR: null
    }
    expect(filterWorktrees([phone], needsYouOnly, '').map((w) => w.worktreeId)).toEqual(['wt-1'])
  })
})
