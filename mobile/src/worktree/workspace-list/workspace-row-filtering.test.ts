import { describe, expect, it } from 'vitest'
import { NO_WORKSPACE_ROW_FILTERS } from '../../../../src/shared/workspace-view/workspace-row-filters'
import type { Worktree } from './workspace-list-types'
import { filterWorktrees, isListNarrowed } from './workspace-row-filtering'
import { getWorktreeRowIdentity } from '../row-presentation/worktree-host-row-identity'

function row(worktreeId: string, overrides: Partial<Worktree> = {}): Worktree {
  return {
    workspaceKind: 'git',
    worktreeId,
    repoId: 'repo-1',
    repo: 'orca',
    branch: 'feature',
    displayName: worktreeId,
    path: `/tmp/${worktreeId}`,
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

const ACTIVE_ONLY = { ...NO_WORKSPACE_ROW_FILTERS, showOnlyRunningTerminals: true }

describe('filterWorktrees under Active only', () => {
  const idleFolder = row('folder-idle', { workspaceKind: 'folder-workspace' })
  const runningChild = row('wt-running', { liveTerminalCount: 1 })
  const idle = row('wt-idle')

  it('keeps an idle folder workspace that a listed row nests under', () => {
    const nesting = new Map([[getWorktreeRowIdentity(idleFolder), [runningChild]]])
    const shown = filterWorktrees(
      [idleFolder, runningChild, idle],
      ACTIVE_ONLY,
      '',
      new Map(),
      undefined,
      nesting
    )
    expect(shown.map((w) => w.worktreeId)).toEqual(['folder-idle', 'wt-running'])
  })

  it('drops an idle folder workspace with nothing listed beneath it', () => {
    const nesting = new Map([[getWorktreeRowIdentity(idleFolder), [idle]]])
    const shown = filterWorktrees(
      [idleFolder, runningChild, idle],
      ACTIVE_ONLY,
      '',
      new Map(),
      undefined,
      nesting
    )
    expect(shown.map((w) => w.worktreeId)).toEqual(['wt-running'])
  })
})

describe('filterWorktrees find', () => {
  it('matches the branch name without its refs/heads/ prefix, like desktop', () => {
    const branchRow = row('wt-1', { branch: 'refs/heads/feature/login' })
    const shown = filterWorktrees([branchRow], NO_WORKSPACE_ROW_FILTERS, 'heads')
    expect(shown).toEqual([])
    expect(filterWorktrees([branchRow], NO_WORKSPACE_ROW_FILTERS, 'feature/login')).toEqual([
      branchRow
    ])
  })
})

describe('filterWorktrees under Needs you', () => {
  it('keeps only the workspaces whose agent waits on you', () => {
    const waiting = row('wt-waiting', { status: 'permission' })
    const working = row('wt-working', { status: 'working' })
    const shown = filterWorktrees(
      [waiting, working, row('wt-idle')],
      { ...NO_WORKSPACE_ROW_FILTERS, showOnlyNeedsYou: true },
      ''
    )
    expect(shown.map((w) => w.worktreeId)).toEqual(['wt-waiting'])
  })
})

describe('isListNarrowed', () => {
  it('treats a search, Live or Needs you as narrowing, so empty groups drop out', () => {
    expect(isListNarrowed('', NO_WORKSPACE_ROW_FILTERS)).toBe(false)
    expect(isListNarrowed('api', NO_WORKSPACE_ROW_FILTERS)).toBe(true)
    expect(
      isListNarrowed('', { ...NO_WORKSPACE_ROW_FILTERS, showOnlyRunningTerminals: true })
    ).toBe(true)
    expect(isListNarrowed('', { ...NO_WORKSPACE_ROW_FILTERS, showOnlyNeedsYou: true })).toBe(true)
  })
})
