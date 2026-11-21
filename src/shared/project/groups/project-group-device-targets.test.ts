import { describe, expect, it } from 'vitest'
import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { ProjectGroup } from './project-group-types'
import { getProjectGroupTargetsByDevice } from './project-group-device-targets'

function group(
  id: string,
  name: string,
  host: ExecutionHostId | null,
  parentGroupId: string | null = null
): ProjectGroup {
  return {
    id,
    name,
    parentPath: null,
    parentGroupId,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1,
    ...(host ? { executionHostId: host } : {})
  }
}

const groups = [
  group('work-m5', 'Work M5 Max', null),
  group('zkidz-m5', 'ZKidz', null, 'work-m5'),
  group('jobbify-msi', 'Jobbify', 'runtime:msi'),
  group('zkidz-msi', 'ZKidz', 'runtime:msi'),
  group('work-m1', 'Work M1 Max', 'runtime:m1')
]
const hosts = [
  { id: 'local' as const },
  { id: 'runtime:m1' as const },
  { id: 'runtime:msi' as const }
]

describe('getProjectGroupTargetsByDevice', () => {
  it("offers the project's own machine first and shows other machines' groups as unavailable", () => {
    const sections = getProjectGroupTargetsByDevice({ groups, hosts, ownerHostId: 'runtime:msi' })
    expect(
      sections.map((section) => ({
        hostId: section.hostId,
        available: section.available,
        targets: section.targets.map((target) => `${'  '.repeat(target.depth)}${target.name}`)
      }))
    ).toEqual([
      { hostId: 'runtime:msi', available: true, targets: ['Jobbify', 'ZKidz'] },
      { hostId: 'local', available: false, targets: ['Work M5 Max', '  ZKidz'] },
      { hostId: 'runtime:m1', available: false, targets: ['Work M1 Max'] }
    ])
  })
})
