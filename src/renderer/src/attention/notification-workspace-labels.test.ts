import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { folder } from '@/components/sidebar/worktree-list/parity/sidebar-list-golden-factories.test-fixture'
import {
  repo,
  worktree
} from '@/components/sidebar/worktree-list/grouping/worktree-list-groups-test-fixtures'
import { getDefaultSettings } from '../../../shared/orca-profiles/constants'
import type { ExecutionHostId } from '../../../shared/execution-host/execution-host'
import { folderWorkspaceKey } from '../../../shared/workspace/identity/workspace-scope'
import { getNotificationWorkspaceLabels } from './notification-workspace-labels'
import type { ProjectGroup } from '../../../shared/project/groups/project-group-types'

// Local builder: the shared fixture was removed upstream.
function makeProjectGroup(overrides: Partial<ProjectGroup>): ProjectGroup {
  return {
    id: 'group-mixed',
    name: 'group',
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1,
    connectionId: null,
    ...overrides
  }
}

const M1: ExecutionHostId = 'runtime:env-b'
const settings = {
  ...getDefaultSettings('/home/me'),
  hostSettingOverrides: { [M1]: { displayLabel: 'M1 Max' } }
}
const labels = (workspaceId: string) =>
  getNotificationWorkspaceLabels(useAppStore.getState(), workspaceId)

describe('getNotificationWorkspaceLabels device prefix', () => {
  afterEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it("leaves this computer's workspace titled by its repo alone", () => {
    useAppStore.setState({ settings, repos: [repo], worktreesByRepo: { [repo.id]: [worktree] } })
    expect(labels(worktree.id).repoLabel).toBe('orca')
  })

  it("names another machine's workspace by machine first", () => {
    const m1Repo = { ...repo, executionHostId: M1 }
    useAppStore.setState({
      settings,
      repos: [m1Repo],
      worktreesByRepo: { [repo.id]: [{ ...worktree, hostId: M1 }] }
    })
    expect(labels(worktree.id).repoLabel).toBe('M1 Max · orca')
  })

  it("names another machine's folder workspace by machine before its group", () => {
    const m1Folder = folder('fw-1', 'pg-1', { executionHostId: M1 })
    useAppStore.setState({
      settings,
      folderWorkspaces: [m1Folder],
      projectGroups: [makeProjectGroup({ id: 'pg-1', name: 'Clients', executionHostId: M1 })]
    })
    expect(labels(folderWorkspaceKey(m1Folder.id)).repoLabel).toBe('M1 Max · Clients')
  })

  it('adds no machine name when there is no repo label to prefix', () => {
    useAppStore.setState({
      settings,
      worktreesByRepo: { [repo.id]: [{ ...worktree, hostId: M1 }] }
    })
    expect(labels(worktree.id).repoLabel).toBeUndefined()
  })
})
