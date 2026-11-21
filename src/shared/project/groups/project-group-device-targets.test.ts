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
const hostOrder = ['local', 'runtime:m1', 'runtime:msi'] as const

describe('getProjectGroupTargetsByDevice', () => {
  it("offers the project's own machine first and shows other machines' groups as unavailable", () => {
    const sections = getProjectGroupTargetsByDevice({
      groups,
      hostOrder,
      ownerHostId: 'runtime:msi'
    })
    expect(
      sections.map((section) => ({
        hostId: section.hostId,
        available: section.available,
        groupChoices: section.groupChoices.map(
          (choice) => `${'  '.repeat(choice.depth)}${choice.name}`
        )
      }))
    ).toEqual([
      { hostId: 'runtime:msi', available: true, groupChoices: ['Jobbify', 'ZKidz'] },
      { hostId: 'local', available: false, groupChoices: ['Work M5 Max', '  ZKidz'] },
      { hostId: 'runtime:m1', available: false, groupChoices: ['Work M1 Max'] }
    ])
  })
})
