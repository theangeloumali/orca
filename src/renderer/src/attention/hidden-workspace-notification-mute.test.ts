import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { folder } from '@/components/sidebar/worktree-list/parity/sidebar-list-golden-factories.test-fixture'
import {
  repo,
  worktree
} from '@/components/sidebar/worktree-list/grouping/worktree-list-groups-test-fixtures'
import { getDefaultSettings } from '../../../shared/orca-profiles/constants'
import { folderWorkspaceKey } from '../../../shared/workspace/identity/workspace-scope'
import { isWorkspaceNotificationMutedBySidebarFilters } from './hidden-workspace-notification-mute'

const STATUSES = new Map()
const runningFolder = folder('fw-running', 'pg-1')
const idleFolder = folder('fw-idle', 'pg-1')
const runningKey = folderWorkspaceKey(runningFolder.id)

const isMuted = (workspaceId: string): boolean =>
  isWorkspaceNotificationMutedBySidebarFilters(useAppStore.getState(), STATUSES, workspaceId)

describe('isWorkspaceNotificationMutedBySidebarFilters under Active only', () => {
  beforeEach(() => {
    const defaults = getDefaultSettings('/home/me')
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [worktree] },
      folderWorkspaces: [runningFolder, idleFolder],
      tabsByWorktree: { [runningKey]: [makeTab({ id: 'tab-1', worktreeId: runningKey })] },
      ptyIdsByTabId: { 'tab-1': ['pty-1'] },
      settings: {
        ...defaults,
        notifications: { ...defaults.notifications, notifyHiddenWorkspaces: false }
      },
      persistedUIReady: true,
      workspaceSessionReady: true,
      showOnlyRunningTerminals: true
    })
  })
  afterEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('mutes an idle folder workspace the list hides, as it mutes a hidden worktree', () => {
    expect(isMuted(worktree.id)).toBe(true)
    expect(isMuted(folderWorkspaceKey(idleFolder.id))).toBe(true)
  })

  it('keeps notifying for a folder workspace with a running terminal', () => {
    expect(isMuted(runningKey)).toBe(false)
  })

  it('never mutes a listed workspace because of a find query', () => {
    useAppStore.setState((state) => ({
      tabsByWorktree: {
        ...state.tabsByWorktree,
        [worktree.id]: [makeTab({ id: 'tab-2', worktreeId: worktree.id })]
      },
      ptyIdsByTabId: { ...state.ptyIdsByTabId, 'tab-2': ['pty-2'] },
      sidebarFindQuery: 'matches-nothing'
    }))
    expect(isMuted(worktree.id)).toBe(false)
    expect(isMuted(runningKey)).toBe(false)
  })

  it('still notifies a needs-you event while Needs you is on, before its status lands', () => {
    useAppStore.setState({ showOnlyRunningTerminals: false, showOnlyNeedsYou: true })
    expect(isMuted(worktree.id)).toBe(false)
  })
})
