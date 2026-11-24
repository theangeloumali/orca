import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store/index'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { folder } from '../parity/sidebar-list-golden-factories.test-fixture'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import { buildVisibleWorktreeOptionsFromState } from './visible-worktree-options-from-state'
import { selectListedFolderWorkspaces } from './listed-folder-workspaces'

const localFolder = folder('fw-local', 'pg-1')
const tabWorktreeId = folderWorkspaceKey(localFolder.id)

function listedFolderIdsUnderLive(ptyId: string): string[] {
  useAppStore.setState({
    showOnlyRunningTerminals: true,
    folderWorkspaces: [localFolder],
    tabsByWorktree: { [tabWorktreeId]: [makeTab({ id: 'tab-1', worktreeId: tabWorktreeId })] },
    ptyIdsByTabId: { 'tab-1': [ptyId] }
  })
  const state = useAppStore.getState()
  const options = buildVisibleWorktreeOptionsFromState(
    state,
    new Map(),
    getIndexedRepoMap(state.repos)
  )
  return selectListedFolderWorkspaces(options, {
    folders: [localFolder],
    projectGroups: [],
    visibleHostIdSet: null,
    listedWorktrees: []
  }).map((entry) => entry.id)
}

afterEach(() => useAppStore.setState(useAppStore.getInitialState(), true))

it('lists a folder under Live only for a PTY on its own machine', () => {
  expect(listedFolderIdsUnderLive('pty-1')).toEqual(['fw-local'])
  expect(listedFolderIdsUnderLive(toAppSshPtyId('gpu-vm', 'pty-1'))).toEqual([])
})
