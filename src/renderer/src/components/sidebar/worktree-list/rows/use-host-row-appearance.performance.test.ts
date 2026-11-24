// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  getRepoExecutionHostIdOrDefault
} from '../../../../../../shared/execution-host/execution-host'
import {
  addHostSectionRows,
  type HostSectionOption
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { Row } from '../../../../../../shared/sidebar-list/row-types'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { useClientGroupingHintRows } from '../client-grouping/use-client-suggestions'
import {
  remoteRepo,
  remoteWorktree,
  repo,
  worktree
} from '../grouping/worktree-list-groups-test-fixtures'
import { useHostRowAppearance } from './use-host-row-appearance'

const REMOTE_HOST_ID = getRepoExecutionHostIdOrDefault(remoteRepo, 'local')
const HOSTS: HostSectionOption[] = [
  { id: 'local', kind: 'local', label: 'M5', detail: 'This computer', health: 'local' },
  { id: REMOTE_HOST_ID, kind: 'ssh', label: 'GPU', detail: 'Host', health: 'available' }
]
const itemRow = (rowRepo: typeof repo, rowWorktree: typeof worktree): Row => ({
  type: 'item',
  rowKey: rowWorktree.id,
  sectionKey: 'all',
  worktree: rowWorktree,
  repo: rowRepo,
  depth: 0,
  groupDepth: 0,
  isLastLineageChild: true,
  lineageChildCount: 0
})
const SECTION_ROWS = addHostSectionRows({
  rows: [itemRow(repo, worktree), itemRow(remoteRepo, remoteWorktree)],
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

// The viewport's pipeline: hint rows feed the appearance pass, and both mount once per sidebar.
function useViewportHostRows() {
  const renderRows = useClientGroupingHintRows(SECTION_ROWS)
  return { renderRows, hostAppearanceByRow: useHostRowAppearance(renderRows, HOSTS) }
}

it('a title write keeps the render rows and host appearance; a color change rescans only the colors', () => {
  const { result } = renderHook(useViewportHostRows)
  const mounted = result.current

  for (let write = 0; write < 20; write++) {
    act(() => {
      useAppStore.setState(titleWrite(`vim ${write}`))
    })
  }
  expect(result.current.renderRows).toBe(mounted.renderRows)
  expect(result.current.hostAppearanceByRow).toBe(mounted.hostAppearanceByRow)

  act(() => {
    useAppStore.setState({
      settings: {
        ...getDefaultSettings('/home'),
        hostSettingOverrides: { [REMOTE_HOST_ID]: { color: '#ef4444' } }
      }
    })
  })
  expect(result.current.renderRows).toBe(mounted.renderRows)
  expect(result.current.hostAppearanceByRow).not.toBe(mounted.hostAppearanceByRow)
  const remoteItem = result.current.renderRows.findIndex(
    (row) => row.type === 'item' && row.worktree.id === remoteWorktree.id
  )
  expect(result.current.hostAppearanceByRow[remoteItem]?.color).toBe('#ef4444')
})
