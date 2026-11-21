import { describe, expect, it } from 'vitest'
import {
  activeWorkspaceRowFilterKeys,
  filterFolderWorkspacesForActiveOnly,
  filterWorkspaceRows,
  NO_WORKSPACE_ROW_FILTERS,
  type WorkspaceRowFactReader
} from './workspace-row-filters'
import { filterWorktrees } from '../../../mobile/src/worktree/workspace-list/workspace-row-filtering'
import type { Worktree as PhoneWorktree } from '../../../mobile/src/worktree/workspace-list/workspace-list-types'
import { activityHasRunningTerminal } from '../sidebar-list/feed-facts/workspace-activity-facts'

type Row = { id: string; running: boolean; main?: boolean; folder?: boolean }

const read: WorkspaceRowFactReader<Row> = {
  isArchived: () => false,
  isInHiddenProject: () => false,
  isProjectHidden: () => false,
  isFolderWorkspace: (row) => row.folder === true,
  repoId: () => 'repo-1',
  hostId: () => 'local',
  isOtherClient: () => false,
  isDefaultBranch: (row) => row.main === true,
  isAutomationCreated: () => false,
  isCliCreated: () => false,
  isDetachedHead: () => false,
  isMainWorktree: (row) => row.main === true,
  isSleeping: (row) => !row.running,
  hasRunningTerminal: (row) => row.running
}

const activeOnly = { ...NO_WORKSPACE_ROW_FILTERS, showOnlyRunningTerminals: true }
const ids = (rows: Row[]): string[] => rows.map((row) => row.id)

describe('showOnlyRunningTerminals', () => {
  it('keeps a row with a live terminal and drops one without', () => {
    const rows = [
      { id: 'live', running: true },
      { id: 'dead', running: false }
    ]
    expect(ids(filterWorkspaceRows(rows, activeOnly, read))).toEqual(['live'])
  })

  it('gives the main checkout no exemption', () => {
    const rows = [{ id: 'main', running: false, main: true }]
    expect(filterWorkspaceRows(rows, activeOnly, read)).toEqual([])
  })

  it('also drops a folder workspace with nothing running', () => {
    const rows = [{ id: 'folder', running: false, folder: true }]
    expect(filterWorkspaceRows(rows, activeOnly, read)).toEqual([])
  })

  it('keeps every row while off', () => {
    const rows = [{ id: 'dead', running: false, main: true }]
    expect(ids(filterWorkspaceRows(rows, NO_WORKSPACE_ROW_FILTERS, read))).toEqual(['dead'])
  })

  it('counts as an active filter so Clear filters resets it', () => {
    expect(activeWorkspaceRowFilterKeys(activeOnly)).toEqual(['showOnlyRunningTerminals'])
  })

  it('drops a phone row whose host counts no live terminal and keeps one that counts some', () => {
    const idle: PhoneWorktree = {
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
    const running = { ...idle, worktreeId: 'wt-2', liveTerminalCount: 2 }
    expect(filterWorktrees([idle, running], activeOnly, '').map((w) => w.worktreeId)).toEqual([
      'wt-2'
    ])
  })
})

describe('filterFolderWorkspacesForActiveOnly', () => {
  const folders = [
    { id: 'idle', running: false },
    { id: 'live', running: true }
  ]
  const isRunning = (folder: { running: boolean }): boolean => folder.running

  it('keeps only folder workspaces with a running terminal while on', () => {
    expect(ids([...filterFolderWorkspacesForActiveOnly(folders, activeOnly, isRunning)])).toEqual([
      'live'
    ])
  })

  it('keeps every folder workspace while off', () => {
    expect(filterFolderWorkspacesForActiveOnly(folders, NO_WORKSPACE_ROW_FILTERS, isRunning)).toBe(
      folders
    )
  })
})

describe('activityHasRunningTerminal', () => {
  const idle = { terminal: null, browser: false, structuredChat: false, agent: null }

  it('reads a live terminal as running', () => {
    expect(activityHasRunningTerminal({ ...idle, terminal: 'live' })).toBe(true)
  })

  it('keeps a lost-contact terminal it cannot judge', () => {
    expect(activityHasRunningTerminal({ ...idle, terminal: 'unverifiable' })).toBe(true)
  })

  it('reads no terminal, or no listed activity, as not running', () => {
    expect(activityHasRunningTerminal(idle)).toBe(false)
    expect(activityHasRunningTerminal(undefined)).toBe(false)
  })
})
