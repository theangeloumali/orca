// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { HOST_COLOR_NONE } from '../../../../../../shared/execution-host/host-appearance'
import {
  openSidebarColorsSettings,
  useHostAppearanceControls,
  useProjectGroupAppearanceControls
} from './appearance-controls'
import { HOST_COLOR_AUTO } from './host-color-menu'
import { SIDEBAR_COLORS_SETTING_ID } from '../../../settings/appearance/appearance-sidebar-colors-search'

const group = (overrides: Partial<ProjectGroup>): ProjectGroup => ({
  id: 'clients',
  name: 'Clients',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0,
  ...overrides
})

const updateProjectGroup = vi.fn(async () => true)

beforeEach(() => {
  updateProjectGroup.mockClear()
  useAppStore.setState({
    settings: { ...getDefaultSettings('/home/test'), hostSettingOverrides: {} },
    projectGroups: [group({ executionHostId: 'runtime:a' }), group({ color: '#123456' })],
    updateProjectGroup,
    updateSettings: async (updates) => {
      useAppStore.setState((state) => ({
        settings: state.settings ? { ...state.settings, ...updates } : state.settings
      }))
    }
  })
})
afterEach(cleanup)

describe('useProjectGroupAppearanceControls', () => {
  it('reads the colored copy and shows a non-swatch hex as custom', () => {
    const { result } = renderHook(() => useProjectGroupAppearanceControls('clients'))
    expect(result.current.colorValue).toBe('#123456')
    expect(result.current.customColor).toBe('#123456')
    expect(result.current.tint).toBe('subtle')
  })

  it('saves swatches, clears on None and ignores an invalid hex', () => {
    const { result } = renderHook(() => useProjectGroupAppearanceControls('clients', 'runtime:a'))
    act(() => result.current.selectColor('#22c55e'))
    act(() => result.current.selectColor(HOST_COLOR_NONE))
    act(() => result.current.selectColor('not-a-color'))
    expect(updateProjectGroup.mock.calls).toEqual([
      ['clients', { color: '#22c55e' }, { hostId: 'runtime:a' }],
      ['clients', { color: null }, { hostId: 'runtime:a' }]
    ])
  })

  it('keeps the background strength in this computer settings', () => {
    const { result } = renderHook(() => useProjectGroupAppearanceControls('clients'))
    act(() => result.current.selectTint('strong'))
    expect(useAppStore.getState().settings?.projectGroupTints).toEqual({ clients: 'strong' })
    expect(result.current.tint).toBe('strong')
  })
})

describe('useHostAppearanceControls', () => {
  it('saves a swatch and Automatic clears it again', () => {
    const { result } = renderHook(() => useHostAppearanceControls('local'))
    act(() => result.current.selectColor('#22c55e'))
    expect(result.current.colorValue).toBe('#22c55e')
    act(() => result.current.selectColor(HOST_COLOR_AUTO))
    expect(result.current.colorValue).toBe(HOST_COLOR_AUTO)
  })
})

it('opens Appearance settings at the sidebar colors section', () => {
  openSidebarColorsSettings()
  const state = useAppStore.getState()
  expect(state.activeView).toBe('settings')
  expect(state.settingsNavigationTarget).toMatchObject({
    pane: 'appearance',
    sectionId: SIDEBAR_COLORS_SETTING_ID
  })
})
