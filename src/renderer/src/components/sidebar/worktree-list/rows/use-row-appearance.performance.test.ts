// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { ALL_EXECUTION_HOSTS_SCOPE } from '../../../../../../shared/execution-host/execution-host'
import {
  addHostSectionRows,
  type HostSectionOption
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Row } from '../../../../../../shared/sidebar-list/row-types'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { useClientGroupingHintRows } from '../client-grouping/use-client-suggestions'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { useRowAppearance } from './use-row-appearance'

const HOSTS: HostSectionOption[] = [
  { id: 'local', kind: 'local', label: 'M5', detail: 'This computer', health: 'local' }
]
const GROUP: ProjectGroup = {
  id: 'clients',
  name: 'Clients',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: '#ef4444',
  createdAt: 0,
  updatedAt: 0
}
const groupedRepo = { ...repo, projectGroupId: GROUP.id }
const ITEM: Row = {
  type: 'item',
  rowKey: worktree.id,
  sectionKey: 'all',
  worktree,
  repo: groupedRepo,
  depth: 0,
  groupDepth: 0,
  isLastLineageChild: true,
  lineageChildCount: 0
}
const SECTION_ROWS = addHostSectionRows({
  rows: [ITEM],
  hostOptions: HOSTS,
  workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
  defaultHostId: 'local',
  localHostLabel: 'M5',
  showHostSections: true
})
const titleWrite = (title: string) => ({
  tabsByWorktree: { [worktree.id]: [makeTab({ id: 'tab-1', worktreeId: worktree.id, title })] }
})

afterEach(() => {
  cleanup()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

function useViewportRowAppearance() {
  const renderRows = useClientGroupingHintRows(SECTION_ROWS)
  return { renderRows, appearance: useRowAppearance(renderRows, HOSTS) }
}

it('a title write keeps the group appearance; a group color or tint change rescans it', () => {
  useAppStore.setState({ projectGroups: [GROUP] })
  const { result } = renderHook(useViewportRowAppearance)
  const mounted = result.current
  const itemIndex = mounted.renderRows.findIndex((row) => row.type === 'item')
  expect(mounted.appearance.group[itemIndex]?.color).toBe('#ef4444')

  for (let write = 0; write < 20; write++) {
    act(() => {
      useAppStore.setState(titleWrite(`vim ${write}`))
    })
  }
  expect(result.current.appearance).toBe(mounted.appearance)

  act(() => {
    useAppStore.setState({ projectGroups: [{ ...GROUP, color: '#22c55e' }] })
  })
  const recolored = result.current.appearance
  expect(recolored.group).not.toBe(mounted.appearance.group)
  expect(recolored.host).toBe(mounted.appearance.host)
  expect(recolored.group[itemIndex]?.color).toBe('#22c55e')

  act(() => {
    useAppStore.setState({
      settings: { ...getDefaultSettings('/home'), projectGroupTints: { [GROUP.id]: 'strong' } }
    })
  })
  expect(result.current.appearance.group[itemIndex]?.tint).toBe('strong')
})
