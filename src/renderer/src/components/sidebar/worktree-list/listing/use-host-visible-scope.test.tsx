// @vitest-environment happy-dom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { selectSidebarFilterState } from '../controls/sidebar-filter-actions'
import { folder } from '../parity/sidebar-list-golden-factories.test-fixture'
import { worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { useSidebarHostVisibleScope } from './use-host-visible-scope'
import { getFolderWorkspaceHostIdentity } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'

const runningFolder = folder('fw-running', 'pg-1')
const idleFolder = folder('fw-idle', 'pg-1')
const NO_PAIRED_DEVICES = new Map<string, string>()

function visibleFolderIds(
  listedWorktrees: readonly Worktree[] = [],
  lineageParentIdentities?: ReadonlyMap<string, string>,
  workspaceNeedsYou?: (workspace: { id: string }) => boolean
): string[] {
  const { result } = renderHook(() =>
    useSidebarHostVisibleScope({
      filterState: selectSidebarFilterState(useAppStore.getState()),
      defaultHostId: 'local',
      repos: [],
      projectGroups: [],
      folderWorkspaces: [runningFolder, idleFolder],
      pairedDeviceIdsByEnvironment: NO_PAIRED_DEVICES,
      listedWorktrees,
      lineageParentIdentities,
      workspaceNeedsYou
    })
  )
  return result.current.visibleFolderWorkspacesForRows.map((entry) => entry.id)
}

describe('useSidebarHostVisibleScope folder workspaces under Active only', () => {
  beforeEach(() => {
    const tabWorktreeId = folderWorkspaceKey(runningFolder.id)
    useAppStore.setState({
      tabsByWorktree: { [tabWorktreeId]: [makeTab({ id: 'tab-1', worktreeId: tabWorktreeId })] },
      ptyIdsByTabId: { 'tab-1': ['pty-1'] },
      showOnlyRunningTerminals: true
    })
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('reads a folder workspace terminals under its folder: key and drops the idle one', () => {
    expect(visibleFolderIds()).toEqual(['fw-running'])
  })

  it('keeps an idle folder that a listed running workspace nests under', () => {
    const child = { ...worktree, id: 'wt-child' }
    const parents = new Map([
      [getWorktreeHostIdentity(child), getFolderWorkspaceHostIdentity(idleFolder)]
    ])
    expect(visibleFolderIds([child], parents)).toEqual(['fw-running', 'fw-idle'])
  })

  it('applies Needs you to folders through their folder: key', () => {
    useAppStore.setState({ showOnlyRunningTerminals: false, showOnlyNeedsYou: true })
    const needsYou = (workspace: { id: string }) =>
      workspace.id === folderWorkspaceKey(idleFolder.id)
    expect(visibleFolderIds([], undefined, needsYou)).toEqual(['fw-idle'])
  })

  it('matches find against the folder name', () => {
    useAppStore.setState({ showOnlyRunningTerminals: false, sidebarFindQuery: idleFolder.name })
    expect(visibleFolderIds()).toEqual(['fw-idle'])
  })

  it('drops a folder whose only PTY runs on another machine', () => {
    useAppStore.setState({ ptyIdsByTabId: { 'tab-1': [toAppSshPtyId('gpu-vm', 'pty-1')] } })
    expect(visibleFolderIds()).toEqual([])
  })

  it('keeps every folder while Active only is off', () => {
    useAppStore.setState({ showOnlyRunningTerminals: false })
    expect(visibleFolderIds()).toEqual(['fw-running', 'fw-idle'])
  })
})
