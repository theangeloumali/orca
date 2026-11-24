import { describe, expect, it } from 'vitest'
import { hostTintPercents } from '../../../../../../shared/execution-host/host-tint-contrast'
import { buildGroupRowAppearance, groupColorStyle } from './group-row-appearance'

const RED = { id: 'red', parentGroupId: null, color: '#ef4444', updatedAt: 0 }
const NESTED = { id: 'nested', parentGroupId: 'red', color: null, updatedAt: 0 }
const PLAIN = { id: 'plain', parentGroupId: null, color: null, updatedAt: 0 }
const GROUPS = [RED, NESTED, PLAIN]

const groupHeader = (id: string | null) => ({ type: 'header' as const, projectGroup: { id } })
const project = (projectGroupId: string | null) => ({
  type: 'item' as const,
  repo: { projectGroupId }
})
const hostHeader = { type: 'host-header' as const }

describe('group row appearance', () => {
  it('gives a group header and its rows the group color and AA-safe tint shares', () => {
    const byRow = buildGroupRowAppearance([groupHeader('red'), project('red')], GROUPS, undefined)
    expect(byRow[0]).toEqual({
      groupId: 'red',
      color: '#ef4444',
      tint: 'subtle',
      tintPercents: hostTintPercents('#ef4444')
    })
    expect(byRow[1]).toBe(byRow[0])
  })

  it('lets a nested uncolored group inherit its parent color, on any host', () => {
    const rows = [hostHeader, project('nested'), hostHeader, project('red')]
    const byRow = buildGroupRowAppearance(rows, GROUPS, { red: 'strong' })
    expect(byRow[1]).toMatchObject({ groupId: 'red', tint: 'strong' })
    expect(byRow[3]).toBe(byRow[1])
  })

  it('leaves ungrouped, uncolored and host rows to the machine tint', () => {
    const rows = [
      hostHeader,
      groupHeader(null),
      project(null),
      project('plain'),
      groupHeader('gone')
    ]
    expect(buildGroupRowAppearance(rows, GROUPS, undefined)).toEqual([null, null, null, null, null])
  })

  it('colors a group checked out on two machines from whichever copy holds the color', () => {
    const remoteCopy = { ...PLAIN, color: '#22c55e' }
    const [header] = buildGroupRowAppearance([groupHeader('plain')], [remoteCopy, PLAIN], undefined)
    expect(header).toMatchObject({ groupId: 'plain', color: '#22c55e' })
  })

  it('ignores an invalid hex on one copy and takes the next valid copy', () => {
    const brokenCopy = { ...PLAIN, color: 'not-a-color' }
    const validCopy = { ...PLAIN, color: '#22c55e' }
    const [header] = buildGroupRowAppearance(
      [groupHeader('plain')],
      [brokenCopy, validCopy],
      undefined
    )
    expect(header).toMatchObject({ groupId: 'plain', color: '#22c55e' })
  })

  it("lets a nested group's own background win over the parent it takes its color from", () => {
    const rows = [groupHeader('red'), project('red'), groupHeader('nested'), project('nested')]
    const byRow = buildGroupRowAppearance(rows, GROUPS, { red: 'strong', nested: 'off' })
    expect(byRow.map((appearance) => [appearance?.groupId, appearance?.tint])).toEqual([
      ['red', 'strong'],
      ['red', 'strong'],
      ['red', 'off'],
      ['red', 'off']
    ])
  })

  it('keeps the color but turns the background off when the tint is off', () => {
    const [header] = buildGroupRowAppearance([groupHeader('red')], GROUPS, { red: 'off' })
    expect(header).toMatchObject({ color: '#ef4444', tint: 'off' })
  })

  it('sets the color and tint shares as CSS variables', () => {
    const [header] = buildGroupRowAppearance([groupHeader('red')], GROUPS, undefined, null)
    expect(groupColorStyle(header)).toEqual({
      '--group-color': '#ef4444',
      '--group-tint-subtle': '0%',
      '--group-tint-strong': '0%'
    })
    expect(groupColorStyle(null)).toBeUndefined()
  })
})
