import { describe, expect, it } from 'vitest'
import { getDeviceLabel, groupByExecutionHost, withDeviceLabel } from './device-sections'

const hosts = [
  { id: 'local' as const },
  { id: 'runtime:m1' as const },
  { id: 'runtime:msi' as const }
]
const groups = [
  { name: 'Work M5 Max', hostId: 'local' },
  { name: 'ZKidz', hostId: 'local' },
  { name: 'Jobbify', hostId: 'runtime:msi' },
  { name: 'ZKidz', hostId: 'runtime:msi' },
  { name: 'Work M1 Max', hostId: 'runtime:m1' }
] as const
const view = (
  sections: ReturnType<typeof groupByExecutionHost<(typeof groups)[number], (typeof hosts)[number]>>
) => sections.map((section) => [section.hostId, section.items.map((item) => item.name)])

describe('groupByExecutionHost', () => {
  it("puts the item's own machine first, then the sidebar's machine order", () => {
    const sections = groupByExecutionHost({
      items: groups,
      getHostId: (group) => group.hostId,
      hosts,
      anchorHostId: 'runtime:msi'
    })
    expect(view(sections)).toEqual([
      ['runtime:msi', ['Jobbify', 'ZKidz']],
      ['local', ['Work M5 Max', 'ZKidz']],
      ['runtime:m1', ['Work M1 Max']]
    ])
  })

  it('drops machines with nothing to show and keeps items from an unknown machine last', () => {
    const sections = groupByExecutionHost({
      items: [
        { name: 'Docs', hostId: 'ssh:gone' },
        { name: 'ZKidz', hostId: 'local' }
      ] as const,
      getHostId: (group) => group.hostId,
      hosts
    })
    expect(sections.map((section) => [section.hostId, section.host?.id ?? null])).toEqual([
      ['local', 'local'],
      ['ssh:gone', null]
    ])
  })
})

describe('device labels for list rows', () => {
  const labels = new Map([
    ['local' as const, 'Local Mac'],
    ['runtime:m1' as const, 'M1 Max']
  ])

  it("names another machine's item and leaves this Mac's unlabelled", () => {
    expect(getDeviceLabel('runtime:m1', labels)).toBe('M1 Max')
    expect(getDeviceLabel('local', labels)).toBeNull()
    expect(withDeviceLabel('/Users/a/re-client', 'runtime:m1', labels)).toBe(
      'M1 Max · /Users/a/re-client'
    )
    expect(withDeviceLabel('/Users/a/re-client', 'local', labels)).toBe('/Users/a/re-client')
  })
})
