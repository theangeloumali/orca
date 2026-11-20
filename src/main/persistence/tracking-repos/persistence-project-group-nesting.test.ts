import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { closeTestStores, createStore, testState } from '../persistence-test-harness'

vi.mock('electron', () => ({
  app: {
    getPath: () => testState.dir
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plaintext: string) => Buffer.from(`encrypted:${plaintext}`, 'utf-8'),
    decryptString: (ciphertext: Buffer) => ciphertext.toString('utf-8').replace(/^encrypted:/, '')
  }
}))

vi.mock('../../ssh/config/ssh-config-parser', () => ({
  loadUserSshConfig: vi.fn(() => ({ hosts: [] })),
  sshConfigHostsToTargets: vi.fn(() => [])
}))

describe('project group nesting', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'orca-test-'))
  })

  afterEach(async () => {
    await closeTestStores()
    rmSync(testState.dir, { recursive: true, force: true })
  })

  it('moves a group under another group and back to the top level', () => {
    const store = createStore()
    const work = store.createProjectGroup({ name: 'Work', createdFrom: 'manual' })
    const client = store.createProjectGroup({ name: 'OnePuhunan', createdFrom: 'manual' })

    const nested = store.updateProjectGroup(client.id, { parentGroupId: work.id })
    expect(nested?.parentGroupId).toBe(work.id)
    expect(nested?.rootProjectOrder).toBeUndefined()

    // Manual root order is in use once a top-level group has a rank; a lifted group joins after it.
    store.updateProjectGroup(work.id, { rootProjectOrder: 0 })
    const lifted = store.updateProjectGroup(client.id, { parentGroupId: null })
    expect(lifted?.parentGroupId).toBeNull()
    expect(lifted?.rootProjectOrder).toBe(1000)
  })

  it('refuses to move a group into itself or into its own subgroup', () => {
    const store = createStore()
    const work = store.createProjectGroup({ name: 'Work', createdFrom: 'manual' })
    const zkidz = store.createProjectGroup({
      name: 'ZKidz',
      parentGroupId: work.id,
      createdFrom: 'manual'
    })

    expect(() => store.updateProjectGroup(work.id, { parentGroupId: work.id })).toThrow(
      'invalid_project_group_parent'
    )
    expect(() => store.updateProjectGroup(work.id, { parentGroupId: zkidz.id })).toThrow(
      'invalid_project_group_parent'
    )
    expect(store.getProjectGroups().find((group) => group.id === work.id)?.parentGroupId).toBeNull()
  })

  it('refuses a parent group that does not exist', () => {
    const store = createStore()
    const work = store.createProjectGroup({ name: 'Work', createdFrom: 'manual' })

    expect(() => store.updateProjectGroup(work.id, { parentGroupId: 'missing' })).toThrow(
      'invalid_project_group_parent'
    )
    expect(() =>
      store.createProjectGroup({ name: 'Orphan', parentGroupId: 'missing', createdFrom: 'manual' })
    ).toThrow('invalid_project_group_parent')
  })
})
