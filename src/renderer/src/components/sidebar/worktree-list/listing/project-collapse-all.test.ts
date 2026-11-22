import { describe, expect, it } from 'vitest'
import type {
  HostHeaderRow,
  HostSectionRow
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import {
  areAllProjectsCollapsed,
  getRenderedProjectCollapseKeys,
  setAllProjectsCollapsed
} from './project-collapse-all'

function hostHeader(hostId: HostHeaderRow['hostId']): HostHeaderRow {
  return {
    type: 'host-header',
    key: `host:${hostId}`,
    hostId,
    kind: hostId === 'local' ? 'local' : 'runtime',
    label: hostId,
    detail: '',
    health: 'available',
    collapsed: false,
    count: 1,
    defaultHostId: 'local'
  }
}

function projectHeader(key: string): HostSectionRow {
  return { type: 'header', key, count: 1, icon: { kind: 'project' } }
}

const UNRELATED_KEYS = ['lineage:wt-1', 'pinned:host:runtime:remote', 'projects-section']

describe('project collapse-all', () => {
  it('includes rendered machine section keys', () => {
    const rows = [
      hostHeader('local'),
      projectHeader('repo:a'),
      hostHeader('runtime:remote'),
      projectHeader('project-group:g')
    ]

    expect(getRenderedProjectCollapseKeys(rows)).toEqual([
      'host:local',
      'repo:a',
      'host:runtime:remote',
      'project-group:g'
    ])
  })

  it('round-trips machines and projects while leaving unrelated keys alone', () => {
    const rows = [hostHeader('local'), projectHeader('repo:a'), hostHeader('runtime:remote')]
    const keys = getRenderedProjectCollapseKeys(rows)
    const start = new Set(UNRELATED_KEYS)

    const collapsed = setAllProjectsCollapsed(start, keys, true)
    expect(areAllProjectsCollapsed(keys, collapsed)).toBe(true)
    expect([...collapsed].sort()).toEqual(
      [...UNRELATED_KEYS, 'host:local', 'host:runtime:remote', 'repo:a'].sort()
    )

    // Collapsed machines hide their projects, so expand sees only the host keys rendered.
    const expanded = setAllProjectsCollapsed(
      collapsed,
      ['host:local', 'host:runtime:remote'],
      false
    )
    expect([...expanded].sort()).toEqual([...UNRELATED_KEYS].sort())
  })

  it('is not all-collapsed while a machine section is open', () => {
    const keys = ['host:local', 'repo:a']
    expect(areAllProjectsCollapsed(keys, new Set(['repo:a']))).toBe(false)
  })

  it('keeps project-only behaviour without machine sections', () => {
    const rows = [projectHeader('pinned'), projectHeader('repo:a'), projectHeader('all')]
    const keys = getRenderedProjectCollapseKeys(rows)
    expect(keys).toEqual(['pinned', 'repo:a'])

    const collapsed = setAllProjectsCollapsed(new Set(['lineage:wt-1']), keys, true)
    expect([...collapsed].sort()).toEqual(['lineage:wt-1', 'pinned', 'repo:a'])
    expect([...setAllProjectsCollapsed(collapsed, keys, false)]).toEqual(['lineage:wt-1'])
  })
})
