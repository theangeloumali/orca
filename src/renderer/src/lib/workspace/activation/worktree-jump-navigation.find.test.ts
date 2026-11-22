import { beforeEach, describe, expect, it, vi } from 'vitest'

type JumpMocks = {
  state: Record<string, unknown>
  passes: (options?: { ignoreFind?: boolean }) => boolean
  activate: ReturnType<typeof vi.fn<(id: string, options: Record<string, unknown>) => boolean>>
  warning: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted((): JumpMocks => ({
  state: {},
  passes: () => false,
  activate: vi.fn(() => true),
  warning: vi.fn()
}))

vi.mock('@/store/index', () => ({ useAppStore: { getState: () => mocks.state } }))
vi.mock('@/lib/workspace/activation/worktree-activation', () => ({
  activateAndRevealWorkspace: mocks.activate
}))
vi.mock('@/components/sidebar/worktree-list/listing/visible-worktrees', () => ({
  getVisibleWorktreeShortcutTargets: () => []
}))
vi.mock('@/components/sidebar/worktree-list/listing/worktree-filter-visibility', () => ({
  worktreePassesSidebarFilters: (
    _id: string,
    _hostId: string | undefined,
    options?: { ignoreFind?: boolean }
  ) => mocks.passes(options)
}))
vi.mock('sonner', () => ({ toast: { warning: mocks.warning } }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, english: string) => english }))

const { jumpToWorktreeFromSidebar } = await import('./worktree-jump-navigation')

beforeEach(() => {
  mocks.activate.mockClear()
  mocks.warning.mockClear()
  mocks.state = {
    worktreesByRepo: {},
    showSleepingWorkspaces: true,
    filterRepoIds: [],
    hideDefaultBranchWorkspace: false,
    hideAutomationGeneratedWorkspaces: false,
    hideCliCreatedWorkspaces: false,
    hideDetachedHeadWorkspaces: false,
    hideWorkspacesFromOtherDevices: false,
    showOnlyRunningTerminals: false,
    sidebarFindQuery: 'zzz',
    setSidebarFindQuery: (query: string) => {
      mocks.state.sidebarFindQuery = query
    },
    getKnownWorktreeById: () => ({ id: 'wt-1' }),
    revealWorktreeInSidebar: vi.fn()
  }
})

describe('jumping to a workspace hidden by find', () => {
  it('clears find and reveals instead of warning when find alone hides it', () => {
    mocks.passes = (options) => options?.ignoreFind === true || mocks.state.sidebarFindQuery === ''
    expect(jumpToWorktreeFromSidebar('wt-1')).toBe(true)
    expect(mocks.state.sidebarFindQuery).toBe('')
    expect(mocks.activate.mock.calls[0]?.[1]).not.toHaveProperty('revealInSidebar')
    expect(mocks.warning).not.toHaveBeenCalled()
  })

  it('keeps find and warns when another filter hides it too', () => {
    mocks.passes = () => false
    jumpToWorktreeFromSidebar('wt-1')
    expect(mocks.state.sidebarFindQuery).toBe('zzz')
    expect(mocks.warning).toHaveBeenCalledOnce()
  })
})
