import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { readHiddenVmCheckouts } from '@/runtime/ephemeral-vm/vm-create-hidden-checkouts'
import { folder } from '../parity/sidebar-list-golden-factories.test-fixture'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { computeVisibleWorktrees } from '../listing/compute-visible-worktrees'
import type * as VisibleWorktreesModule from '../listing/compute-visible-worktrees'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import {
  createActiveOnlySummarySelector,
  type ActiveOnlySummaryContext
} from './active-only-summary-selector'

vi.mock('../listing/compute-visible-worktrees', async (importOriginal) => {
  const actual = await importOriginal<typeof VisibleWorktreesModule>()
  return { ...actual, computeVisibleWorktrees: vi.fn(actual.computeVisibleWorktrees) }
})

const running = { ...worktree, id: 'wt-running' }
const idle = { ...worktree, id: 'wt-idle' }
const runningFolder = folder('fw-running', 'pg-1')
const STATUSES = new Map()
const idleFolder = folder('fw-idle', 'pg-1')
const emptyRepo = { ...repo, id: 'repo-empty', path: '/tmp/empty', displayName: 'empty' }

function context(overrides: Partial<ActiveOnlySummaryContext> = {}): ActiveOnlySummaryContext {
  return {
    now: 1_000,
    statuses: STATUSES,
    hiddenVmCheckouts: readHiddenVmCheckouts(),
    botListed: undefined,
    agentSendTarget: null,
    ...overrides
  }
}

const pipelineRuns = (): number => vi.mocked(computeVisibleWorktrees).mock.calls.length

describe('createActiveOnlySummarySelector', () => {
  beforeEach(() => {
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [running, idle] },
      tabsByWorktree: { [running.id]: [makeTab({ id: 'tab-1', worktreeId: running.id })] },
      ptyIdsByTabId: { 'tab-1': ['pty-1'] },
      settings: getDefaultSettings('/home/me'),
      showSleepingWorkspaces: true,
      showOnlyRunningTerminals: true
    })
  })
  afterEach(() => {
    vi.mocked(computeVisibleWorktrees).mockClear()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('returns the cached summary after a terminal title-only write', () => {
    const select = createActiveOnlySummarySelector()
    const first = select(useAppStore.getState(), context())
    const runs = pipelineRuns()
    const retitled = makeTab({ id: 'tab-1', worktreeId: running.id, title: 'agent: thinking' })
    useAppStore.setState({ tabsByWorktree: { [running.id]: [retitled] } })
    expect(select(useAppStore.getState(), context())).toBe(first)
    expect(pipelineRuns()).toBe(runs)
  })

  it('recomputes when a terminal starts', () => {
    const select = createActiveOnlySummarySelector()
    select(useAppStore.getState(), context())
    const runs = pipelineRuns()
    const tabs = [makeTab({ id: 'tab-2', worktreeId: idle.id })]
    useAppStore.setState({
      tabsByWorktree: { ...useAppStore.getState().tabsByWorktree, [idle.id]: tabs },
      ptyIdsByTabId: { 'tab-1': ['pty-1'], 'tab-2': ['pty-2'] }
    })
    expect(select(useAppStore.getState(), context()).shownWorkspaces).toBe(2)
    expect(pipelineRuns()).toBeGreaterThan(runs)
  })

  it('returns the cached summary after a settings write that keeps the focused host', () => {
    const select = createActiveOnlySummarySelector()
    const first = select(useAppStore.getState(), context())
    useAppStore.setState({ settings: { ...getDefaultSettings('/home/me') } })
    expect(select(useAppStore.getState(), context())).toBe(first)
  })

  it('leaves out rows listed under their bot, as the drawn list does', () => {
    const select = createActiveOnlySummarySelector()
    const botListed = new Set([getWorktreeHostIdentity(idle)])
    expect(select(useAppStore.getState(), context({ botListed })).totalWorkspaces).toBe(1)
  })

  it('recomputes on a host status change', () => {
    const select = createActiveOnlySummarySelector()
    const first = select(useAppStore.getState(), context())
    expect(select(useAppStore.getState(), context({ statuses: new Map() }))).not.toBe(first)
  })

  it('counts the agent send target as shown, as the list forces it visible', () => {
    const select = createActiveOnlySummarySelector()
    const summary = select(useAppStore.getState(), context({ agentSendTarget: idle.id }))
    expect(summary.shownWorkspaces).toBe(2)
  })

  it('counts empty project headers in the total but not as shown', () => {
    useAppStore.setState({ repos: [repo, emptyRepo], groupBy: 'repo' })
    const summary = createActiveOnlySummarySelector()(useAppStore.getState(), context())
    expect(summary.shownProjects).toBe(1)
    expect(summary.totalProjects).toBe(2)
  })

  it('leaves empty projects out when the list is not grouped by project', () => {
    useAppStore.setState({ repos: [repo, emptyRepo], groupBy: 'none' })
    const summary = createActiveOnlySummarySelector()(useAppStore.getState(), context())
    expect(summary.totalProjects).toBe(1)
  })

  it('keeps the cache across a title-only write with an empty project listed', () => {
    useAppStore.setState({ repos: [repo, emptyRepo], groupBy: 'repo' })
    const select = createActiveOnlySummarySelector()
    const first = select(useAppStore.getState(), context())
    const retitled = makeTab({ id: 'tab-1', worktreeId: running.id, title: 'agent: done' })
    useAppStore.setState({ tabsByWorktree: { [running.id]: [retitled] } })
    expect(select(useAppStore.getState(), context())).toBe(first)
  })

  it('counts folder workspaces like the rows the sidebar draws', () => {
    const tabWorktreeId = folderWorkspaceKey(runningFolder.id)
    useAppStore.setState({
      folderWorkspaces: [runningFolder, idleFolder],
      tabsByWorktree: {
        ...useAppStore.getState().tabsByWorktree,
        [tabWorktreeId]: [makeTab({ id: 'tab-f', worktreeId: tabWorktreeId })]
      },
      ptyIdsByTabId: { 'tab-1': ['pty-1'], 'tab-f': ['pty-f'] }
    })
    const summary = createActiveOnlySummarySelector()(useAppStore.getState(), context())
    expect(summary.shownWorkspaces).toBe(2)
    expect(summary.totalWorkspaces).toBe(4)
  })
})
