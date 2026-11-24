import { describe, expect, it } from 'vitest'
import { SIDEBAR_CONTRAST_THEMES } from '../../../../src/shared/execution-host/host-tint-contrast'
import { groupSectionsByMachine, machineStatusFromHealth } from './machine-sections'
import type { Section, WorkspaceListItem } from './workspace-list-types'

type Host = 'local' | 'ssh:m1' | 'ssh:nas'
const item = (id: string, hostId: Host): WorkspaceListItem =>
  ({ row: { id, hostId }, view: {} }) as unknown as WorkspaceListItem
const section = (key: string, data: WorkspaceListItem[]): Section => ({ key, title: key, data })
const hostOf = (entry: WorkspaceListItem): Host => (entry.row as unknown as { hostId: Host }).hostId
const LABELS: Record<Host, string> = { local: 'This Mac', 'ssh:m1': 'M1', 'ssh:nas': 'Alpha NAS' }

function group(
  sections: Section[],
  options: {
    collapsed?: string[]
    overrides?: [Host, { color?: string; sectionTint?: 'off' }][]
  } = {}
) {
  const grouped = groupSectionsByMachine({
    sections,
    collapsedGroups: new Set(options.collapsed ?? []),
    hostIdOfItem: hostOf,
    hostIdOfSection: () => 'local',
    labelOf: (hostId) => LABELS[hostId as Host],
    statusOf: (hostId) => (hostId === 'ssh:nas' ? 'offline' : 'online'),
    overrides: new Map(options.overrides ?? []),
    palettes: SIDEBAR_CONTRAST_THEMES
  })
  return grouped
}

function grouped(...args: Parameters<typeof group>) {
  const result = group(...args)
  if (!result) {
    throw new Error('expected machine sections')
  }
  return result
}

describe('groupSectionsByMachine', () => {
  it('returns the sections unchanged when every row is on one machine', () => {
    const sections = [section('repo:a', [item('1', 'ssh:m1')])]
    expect(group(sections)).toBeNull()
  })

  it('puts the local machine first, then machines by label, each over its own sections', () => {
    const shared = section('repo:a', [
      item('1', 'ssh:m1'),
      item('2', 'local'),
      item('3', 'ssh:nas')
    ])
    const { rawSections } = grouped([shared, section('repo:b', [item('4', 'ssh:m1')])])
    expect(rawSections.map((s) => s.key)).toEqual([
      'host:local',
      'repo:a@local',
      'host:ssh:nas',
      'repo:a@ssh:nas',
      'host:ssh:m1',
      'repo:a@ssh:m1',
      'repo:b@ssh:m1'
    ])
    const m1 = rawSections.find((s) => s.key === 'host:ssh:m1')
    expect(m1?.machine).toMatchObject({ hostId: 'ssh:m1', label: 'M1', count: 2, status: 'online' })
    expect(rawSections.find((s) => s.key === 'repo:b@ssh:m1')?.collapseKey).toBe('repo:b')
  })

  it('drops a collapsed machine’s sections and empties a collapsed project in each machine', () => {
    const sections = [section('repo:a', [item('1', 'ssh:m1'), item('2', 'local')])]
    const machineCollapsed = grouped(sections, { collapsed: ['host:ssh:m1'] })
    expect(machineCollapsed.rawSections.map((s) => s.key)).toEqual([
      'host:local',
      'repo:a@local',
      'host:ssh:m1'
    ])
    expect(machineCollapsed.rawSections[2]?.machine?.collapsed).toBe(true)
    const projectCollapsed = grouped(sections, { collapsed: ['repo:a'] })
    expect(projectCollapsed.sections.find((s) => s.key === 'repo:a@local')?.data).toEqual([])
    expect(projectCollapsed.rawSections.find((s) => s.key === 'repo:a@local')?.data).toHaveLength(1)
  })

  it('keeps an empty project under its own machine', () => {
    const { rawSections } = grouped([
      section('repo:a', [item('1', 'ssh:m1'), item('2', 'local')]),
      section('repo:empty', [])
    ])
    expect(rawSections.map((s) => s.key)).toContain('repo:empty@local')
  })

  it('colors machines by order unless the desktop chose a color or None, and honours tint off', () => {
    const { rawSections } = grouped(
      [section('repo:a', [item('1', 'ssh:m1'), item('2', 'local'), item('3', 'ssh:nas')])],
      {
        overrides: [
          ['ssh:m1', { color: 'none' }],
          ['ssh:nas', { color: '#3b82f6', sectionTint: 'off' }]
        ]
      }
    )
    const machines = rawSections.flatMap((s) => (s.machine ? [s.machine] : []))
    expect(machines[0]?.color).toMatch(/^#/)
    expect(machines[0]?.tintPercent).toBeGreaterThan(0)
    expect(machines[1]).toMatchObject({ color: '#3b82f6', tintPercent: 0 })
    expect(machines[2]).toMatchObject({ color: null, tintPercent: 0 })
  })
})

describe('machineStatusFromHealth', () => {
  it('reads reachable hosts as online, unreachable as offline, and in-between as unknown', () => {
    expect(machineStatusFromHealth('local')).toBe('online')
    expect(machineStatusFromHealth('available')).toBe('online')
    expect(machineStatusFromHealth('disconnected')).toBe('offline')
    expect(machineStatusFromHealth('connecting')).toBeNull()
    expect(machineStatusFromHealth(undefined)).toBeNull()
  })
})

describe('machine color on child sections', () => {
  it("stamps each project section with its machine's color so rows can tint by it", () => {
    const { rawSections } = grouped(
      [section('repo:a', [item('1', 'ssh:m1'), item('2', 'local')])],
      { overrides: [['ssh:m1', { color: '#22c55e' }]] }
    )
    const child = rawSections.find((s) => s.key === 'repo:a@ssh:m1')
    expect(child?.machineColor).toBe('#22c55e')
    expect(rawSections.find((s) => s.key === 'host:ssh:m1')?.machine?.color).toBe('#22c55e')
  })
})

describe('machine header label', () => {
  it('names a machine by the label its rows carry, as the desktop does', () => {
    const labelled = (id: string, hostId: Host, label: string): WorkspaceListItem =>
      ({ row: { id, hostId }, view: { hostContextLabel: label } }) as unknown as WorkspaceListItem
    const { rawSections } = grouped([
      section('repo:a', [labelled('1', 'ssh:m1', 'M1 Max'), labelled('2', 'local', 'Local Mac')])
    ])
    expect(rawSections.find((s) => s.key === 'host:ssh:m1')?.machine?.label).toBe('M1 Max')
    expect(rawSections.find((s) => s.key === 'host:local')?.machine?.label).toBe('Local Mac')
  })
})
