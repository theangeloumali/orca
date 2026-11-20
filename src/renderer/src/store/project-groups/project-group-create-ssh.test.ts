import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectGroup } from '../../../../shared/project/groups/project-group-types'
import { createTestStore } from '@/store/testing/app-store-test-fixture'

const created: ProjectGroup = {
  id: 'box-group',
  name: 'Box',
  parentPath: null,
  parentGroupId: null,
  connectionId: 'box',
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
}

describe('createProjectGroup on an SSH machine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("saves the group on that machine's SSH target, not on this computer", async () => {
    const create = vi.fn(async () => created)
    vi.stubGlobal('window', { api: { projectGroups: { create, update: vi.fn() } } })
    const store = createTestStore()

    await store.getState().createProjectGroup('Box', 'ssh:box', { parentGroupId: 'server' })

    expect(create).toHaveBeenCalledWith({
      name: 'Box',
      parentGroupId: 'server',
      connectionId: 'box',
      createdFrom: 'manual'
    })
  })
})
