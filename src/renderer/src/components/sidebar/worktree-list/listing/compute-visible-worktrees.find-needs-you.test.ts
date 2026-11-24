import { describe, expect, it } from 'vitest'
import { makeRepo, makeWorktree } from '../../../worktree-jump/worktree-jump-palette-test-fixtures'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ProjectGroupingModel } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import { NO_HIDDEN_PROJECTS } from '../../../../../../shared/project/catalog/hidden-projects'
import { computeVisibleWorktreeIds, type VisibleWorktreeOptions } from './compute-visible-worktrees'
import { createWorktreeNeedsYouReader } from './desktop-workspace-row-facts'

const repo: Repo = { ...makeRepo(), displayName: 'Web App' }
const other: Repo = { ...makeRepo(), id: 'repo-2', path: '/repos/repo-2', displayName: 'Billing' }
const login = makeWorktree('wt-login', 'Login page', { branch: 'refs/heads/feature/auth' })
const checkout = makeWorktree('wt-checkout', 'Checkout', { branch: 'refs/heads/main' })
const invoices = makeWorktree('wt-invoices', 'Invoices', { repoId: 'repo-2' })
const worktreesByRepo = { 'repo-1': [login, checkout], 'repo-2': [invoices] }

const options = (overrides: Partial<VisibleWorktreeOptions> = {}): VisibleWorktreeOptions => ({
  filterRepoIds: [],
  showSleepingWorkspaces: true,
  tabsByWorktree: null,
  ptyIdsByTabId: null,
  worktreeIdsWithLiveAgent: new Set(),
  hideDefaultBranchWorkspace: false,
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hideDetachedHeadWorkspaces: false,
  hideWorkspacesFromOtherDevices: false,
  pairedDeviceIdsByEnvironment: new Map(),
  showOnlyRunningTerminals: false,
  repoMap: new Map([
    [repo.id, repo],
    [other.id, other]
  ]),
  hiddenProjects: NO_HIDDEN_PROJECTS,
  workspaceHostScope: 'all',
  defaultHostId: 'local',
  worktreeLineageById: {},
  terminalHostState: {
    repos: [],
    worktreesByRepo: {},
    wslHostStatuses: {}
  },
  ...overrides
})
const sorted = [login.id, checkout.id, invoices.id]
const visible = (overrides: Partial<VisibleWorktreeOptions>): string[] =>
  computeVisibleWorktreeIds(worktreesByRepo, sorted, options(overrides))

describe('sidebar find', () => {
  it('matches the workspace name', () => {
    expect(visible({ findQuery: 'LOGIN' })).toEqual(['wt-login'])
  })

  it('matches the branch without its refs/heads prefix', () => {
    expect(visible({ findQuery: 'feature/auth' })).toEqual(['wt-login'])
    expect(visible({ findQuery: 'refs' })).toEqual([])
  })

  it('matches the project name', () => {
    expect(visible({ findQuery: 'billing' })).toEqual(['wt-invoices'])
  })

  it('matches the project header label the sidebar shows', () => {
    const projectGrouping: ProjectGroupingModel = {
      projects: [
        {
          id: 'project-1',
          displayName: 'Storefront',
          badgeColor: '',
          sourceRepoIds: [repo.id],
          createdAt: 0,
          updatedAt: 0
        }
      ],
      projectHostSetups: [
        {
          id: 'setup-1',
          projectId: 'project-1',
          hostId: 'local',
          repoId: repo.id,
          path: repo.path,
          displayName: repo.displayName,
          setupState: 'ready',
          setupMethod: 'legacy-repo',
          createdAt: 0,
          updatedAt: 0
        }
      ]
    }
    expect(visible({ findQuery: 'storefront', projectGrouping })).toEqual([
      'wt-login',
      'wt-checkout'
    ])
  })

  it('lists everything for a blank query', () => {
    expect(visible({ findQuery: '   ' })).toEqual(sorted)
  })
})

describe('Needs you on the desktop list', () => {
  const projection = {
    attention: (worktreeId: string) => ({ cls: worktreeId === 'wt-checkout' ? 1 : 3 })
  }

  it('keeps only rows whose attention class is needs-you', () => {
    const worktreeNeedsYou = createWorktreeNeedsYouReader(projection, 0)
    expect(visible({ showOnlyNeedsYou: true, worktreeNeedsYou })).toEqual(['wt-checkout'])
  })

  it('keeps every row when no attention reader is wired', () => {
    expect(visible({ showOnlyNeedsYou: true })).toEqual(sorted)
  })
})
