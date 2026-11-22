import { describe, expect, it } from 'vitest'
import {
  activeWorkspaceRowFilterKeys,
  filterFolderWorkspacesForListingRules,
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

  it('keeps a phone row whose host lost contact with its terminal, as the feed does', () => {
    const lostContact: PhoneWorktree = {
      worktreeId: 'wt-3',
      repoId: 'repo-1',
      repo: 'repo',
      path: '/repo',
      branch: 'feature',
      displayName: 'feature',
      liveTerminalCount: 0,
      unverifiableTerminalCount: 1,
      hasAttachedPty: false,
      unread: false,
      isPinned: false,
      linkedPR: null
    }
    expect(filterWorktrees([lostContact], activeOnly, '').map((w) => w.worktreeId)).toEqual([
      'wt-3'
    ])
  })
})

describe('filterFolderWorkspacesForListingRules', () => {
  type Folder = { id: string; running: boolean }
  const folders: Folder[] = [
    { id: 'idle', running: false },
    { id: 'live', running: true }
  ]
  const lineage = (listedRowIdentities: string[] = [], parents: Record<string, string> = {}) => ({
    hasRunningTerminal: (folder: Folder) => folder.running,
    identityOf: (folder: Folder) => folder.id,
    listedRowIdentities,
    parentIdentityOf: (identity: string): string | undefined => parents[identity]
  })
  const keep = (rows: readonly Folder[], read = lineage()): string[] =>
    ids([...filterFolderWorkspacesForListingRules(rows, activeOnly, read)])

  it('keeps only folder workspaces with a running terminal while on', () => {
    expect(keep(folders)).toEqual(['live'])
  })

  it('keeps every folder workspace while off', () => {
    expect(
      filterFolderWorkspacesForListingRules(folders, NO_WORKSPACE_ROW_FILTERS, lineage())
    ).toBe(folders)
  })

  it('keeps an idle folder that a listed running row nests under', () => {
    expect(keep(folders, lineage(['wt-1'], { 'wt-1': 'idle' }))).toEqual(['idle', 'live'])
  })

  it('drops a folder that fails Needs you or find, keeping one a listed row nests under', () => {
    const read = {
      ...lineage(['wt-1'], { 'wt-1': 'idle' }),
      needsYou: (folder: Folder) => folder.id !== 'live',
      matchesFind: (folder: Folder) => folder.id !== 'idle'
    }
    const needsYouOn = { ...NO_WORKSPACE_ROW_FILTERS, showOnlyNeedsYou: true }
    expect(ids([...filterFolderWorkspacesForListingRules(folders, needsYouOn, read)])).toEqual([
      'idle'
    ])
    const findOnly = { ...read, listedRowIdentities: [], needsYou: undefined }
    expect(
      ids([...filterFolderWorkspacesForListingRules(folders, NO_WORKSPACE_ROW_FILTERS, findOnly)])
    ).toEqual(['live'])
  })

  it('keeps an idle parent folder above a running child folder', () => {
    const nested = [
      { id: 'parent', running: false },
      { id: 'child', running: true }
    ]
    expect(keep(nested, lineage([], { child: 'parent' }))).toEqual(['parent', 'child'])
  })

  it('stays finite when parent links form a cycle', () => {
    expect(keep(folders, lineage(['wt-1'], { 'wt-1': 'idle', idle: 'wt-1' }))).toEqual([
      'idle',
      'live'
    ])
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
