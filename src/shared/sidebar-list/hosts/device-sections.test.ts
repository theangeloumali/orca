import { describe, expect, it } from 'vitest'
import { groupByExecutionHost, withDeviceLabel } from './device-sections'

const groups = [
  { name: 'Work M5 Max', hostId: 'local' },
  { name: 'ZKidz', hostId: 'local' },
  { name: 'Jobbify', hostId: 'runtime:msi' },
  { name: 'ZKidz', hostId: 'runtime:msi' },
  { name: 'Work M1 Max', hostId: 'runtime:m1' }
] as const

describe('groupByExecutionHost', () => {
  it("puts the item's own machine first, then the sidebar's machine order", () => {
    const sections = groupByExecutionHost({
      items: groups,
      getHostId: (group) => group.hostId,
      hostOrder: ['local', 'runtime:m1', 'runtime:msi'],
      anchorHostId: 'runtime:msi'
    })
    expect(
      sections.map((section) => [section.hostId, section.items.map((item) => item.name)])
    ).toEqual([
      ['runtime:msi', ['Jobbify', 'ZKidz']],
      ['local', ['Work M5 Max', 'ZKidz']],
      ['runtime:m1', ['Work M1 Max']]
    ])
  })

  it('drops machines with nothing to show and keeps machines missing from the order last', () => {
    const sections = groupByExecutionHost({
      items: [
        { name: 'Docs', hostId: 'ssh:gone' },
        { name: 'ZKidz', hostId: 'local' }
      ] as const,
      getHostId: (group) => group.hostId,
      hostOrder: ['local', 'runtime:m1']
    })
    expect(sections.map((section) => section.hostId)).toEqual(['local', 'ssh:gone'])
  })
})

describe('withDeviceLabel', () => {
  const labels = new Map([['runtime:m1', 'M1 Max']])

  it("names another machine's row and leaves this computer's unlabelled", () => {
    expect(withDeviceLabel('/Users/a/re-client', 'runtime:m1', labels)).toBe(
      'M1 Max · /Users/a/re-client'
    )
    expect(withDeviceLabel('/Users/a/re-client', 'local', labels)).toBe('/Users/a/re-client')
  })
})
