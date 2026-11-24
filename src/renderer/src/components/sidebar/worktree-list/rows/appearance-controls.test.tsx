// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getRepoExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { HOST_COLOR_NONE } from '../../../../../../shared/execution-host/host-appearance'
import { projectGroupOwnerColor } from '../../../../../../shared/project/groups/project-group-appearance'
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

type GroupWrite = { groupId: string; color: string | null | undefined; hostId?: string }
let groupWrites: GroupWrite[] = []

beforeEach(() => {
  groupWrites = []
  useAppStore.setState({
    settings: { ...getDefaultSettings('/home/test'), hostSettingOverrides: {} },
    projectGroups: [group({ executionHostId: 'runtime:a' }), group({ color: '#123456' })],
    // Applies each write to the copy on that host, like the runtime echo does.
    updateProjectGroups: async (mutations) => {
      groupWrites.push(
        ...mutations.map(({ groupId, updates, hostId }) => ({
          groupId,
          color: updates.color,
          hostId
        }))
      )
      useAppStore.setState((state) => ({
        projectGroups: state.projectGroups.map((copy) => {
          const write = mutations.find(
            (mutation) =>
              mutation.groupId === copy.id && mutation.hostId === getRepoExecutionHostId(copy)
          )
          return write
            ? { ...copy, color: write.updates.color ?? null, updatedAt: copy.updatedAt + 1 }
            : copy
        })
      }))
      return true
    },
    updateSettings: async (updates) => {
      useAppStore.setState((state) => ({
        settings: state.settings ? { ...state.settings, ...updates } : state.settings
      }))
    }
  })
})
afterEach(cleanup)

// The header passes the color its row shows, so the menu reads the same owner as the sidebar.
function renderGroupControls(groupId = 'clients', ownerGroupId = groupId) {
  return renderHook(() =>
    useProjectGroupAppearanceControls(groupId, {
      color: useAppStore((s) => projectGroupOwnerColor(s.projectGroups, groupId)),
      ownerGroupId
    })
  )
}

describe('useProjectGroupAppearanceControls', () => {
  it('reads the colored copy and shows a non-swatch hex as custom', () => {
    const { result } = renderGroupControls()
    expect(result.current.colorValue).toBe('#123456')
    expect(result.current.customColor).toBe('#123456')
    expect(result.current.tint).toBe('subtle')
  })

  it('writes None to every copy, so a group on two hosts shows no color anywhere', async () => {
    const { result } = renderGroupControls()
    await act(async () => result.current.selectColor(HOST_COLOR_NONE))
    expect(groupWrites).toEqual([
      { groupId: 'clients', color: null, hostId: 'runtime:a' },
      { groupId: 'clients', color: null, hostId: 'local' }
    ])
    expect(useAppStore.getState().projectGroups.map((copy) => copy.color)).toEqual([null, null])
    expect(result.current.colorValue).toBe(HOST_COLOR_NONE)
  })

  it('saves swatches on every copy and ignores an invalid hex', async () => {
    const { result } = renderGroupControls()
    await act(async () => result.current.selectColor('#22c55e'))
    await act(async () => result.current.selectColor('not-a-color'))
    expect(groupWrites.map(({ color }) => color)).toEqual(['#22c55e', '#22c55e'])
    expect(result.current.colorValue).toBe('#22c55e')
  })

  it('shows the color that saved when another machine keeps a stale copy, and names that machine', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'toast')
    const saveOnline = useAppStore.getState().updateProjectGroups
    useAppStore.setState((state) => ({
      settings: state.settings && {
        ...state.settings,
        hostSettingOverrides: { 'runtime:a': { displayLabel: 'M1 MAX' } }
      },
      projectGroups: [group({ executionHostId: 'runtime:a', color: '#ef4444' }), group({})],
      updateProjectGroups: async (mutations) => {
        if (mutations.some(({ hostId }) => hostId === 'runtime:a')) {
          throw new Error('offline')
        }
        return saveOnline(mutations)
      }
    }))
    const { result } = renderGroupControls()
    await act(async () => result.current.selectColor('#22c55e'))
    expect(useAppStore.getState().projectGroups.map((copy) => copy.color)).toEqual([
      '#ef4444',
      '#22c55e'
    ])
    expect(result.current.colorValue).toBe('#22c55e')
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('M1 MAX'))
    toastError.mockRestore()
  })

  it('keeps the background strength in this computer settings', () => {
    const { result } = renderGroupControls()
    act(() => result.current.selectTint('strong'))
    expect(useAppStore.getState().settings?.projectGroupTints).toEqual({ clients: 'strong' })
    expect(result.current.tint).toBe('strong')
  })

  it('shows a nested group the background it inherits until it picks its own', () => {
    act(() => {
      void useAppStore.getState().updateSettings({ projectGroupTints: { clients: 'strong' } })
    })
    const { result } = renderGroupControls('acme', 'clients')
    expect(result.current.tint).toBe('strong')
    act(() => result.current.selectTint('subtle'))
    expect(useAppStore.getState().settings?.projectGroupTints).toEqual({
      clients: 'strong',
      acme: 'subtle'
    })
    expect(result.current.tint).toBe('subtle')
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
