import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectGroup } from '../../../../shared/project/groups/project-group-types'
import { getDefaultSettings } from '../../../../shared/orca-profiles/constants'
import { createTestStore } from '@/store/testing/app-store-test-fixture'

const acme = (overrides: Partial<ProjectGroup>): ProjectGroup => ({
  id: 'acme',
  name: 'Acme',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: '#22c55e',
  createdAt: 1,
  updatedAt: 1,
  ...overrides
})

function storeWith(projectGroups: ProjectGroup[]) {
  vi.stubGlobal('window', { api: { projectGroups: { delete: vi.fn(async () => true) } } })
  const store = createTestStore()
  const updateSettings = vi.fn(async () => undefined)
  store.setState({
    projectGroups,
    settings: {
      ...getDefaultSettings('~'),
      projectGroupTints: { acme: 'off', 'acme-eu': 'strong', oss: 'strong' }
    },
    updateSettings
  })
  return { store, updateSettings }
}

describe('deleting a project group', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('drops its background and its subgroups’ once no copy of the group is left', async () => {
    const { store, updateSettings } = storeWith([
      acme({}),
      acme({ id: 'acme-eu', name: 'EU', parentGroupId: 'acme' }),
      acme({ id: 'oss', name: 'OSS' })
    ])
    await store.getState().deleteProjectGroup('acme', { hostId: 'local' })
    expect(updateSettings).toHaveBeenCalledWith({ projectGroupTints: { oss: 'strong' } })
  })

  it('keeps it while a copy on another host still shows the group', async () => {
    const { store, updateSettings } = storeWith([
      acme({}),
      acme({ executionHostId: 'runtime:a' }),
      acme({ id: 'acme-eu', name: 'EU', parentGroupId: 'acme', executionHostId: 'runtime:a' }),
      acme({ id: 'oss', name: 'OSS' })
    ])
    await store.getState().deleteProjectGroup('acme', { hostId: 'local' })
    expect(updateSettings).not.toHaveBeenCalled()
  })
})
