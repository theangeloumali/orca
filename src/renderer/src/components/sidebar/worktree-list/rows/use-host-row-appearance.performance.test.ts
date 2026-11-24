// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { useHostRowAppearance } from './use-host-row-appearance'

const ROWS = [{ type: 'host-header' as const, hostId: 'local' as const }, { type: 'item' as const }]
const ORDER = [{ id: 'local' }]
const titleWrite = (title: string) => ({
  tabsByWorktree: { [worktree.id]: [makeTab({ id: 'tab-1', worktreeId: worktree.id, title })] }
})

afterEach(() => {
  cleanup()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

// Rows mount by the hundreds; a terminal title write must not rescan host colors.
it('keeps the host row appearance on a title write and rescans on a color change', () => {
  const { result } = renderHook(() => useHostRowAppearance(ROWS, ORDER))
  const mounted = result.current

  for (let write = 0; write < 20; write++) {
    act(() => {
      useAppStore.setState(titleWrite(`vim ${write}`))
    })
  }
  expect(result.current).toBe(mounted)

  act(() => {
    useAppStore.setState({
      settings: {
        ...getDefaultSettings('/home'),
        hostSettingOverrides: { local: { color: '#ef4444' } }
      }
    })
  })
  expect(result.current).not.toBe(mounted)
  expect(result.current[1]?.color).toBe('#ef4444')
})
