// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import type { ProjectGroup } from '../../../../../shared/project/groups/project-group-types'
import { SidebarColorsSetting } from './SidebarColorsSetting'

const configuredDevices = vi.hoisted(() => ({ hosts: [{ id: 'local', label: 'This Mac' }] }))
vi.mock('../notifications/use-notification-source-options', () => ({
  useNotificationSourceOptions: () => configuredDevices.hosts
}))

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

const updateProjectGroups = vi.fn(async () => true)

beforeEach(() => {
  updateProjectGroups.mockClear()
  configuredDevices.hosts = [{ id: 'local', label: 'This Mac' }]
  useAppStore.setState({
    settingsSearchQuery: '',
    settings: { ...getDefaultSettings('/home/test'), hostSettingOverrides: {} },
    projectGroups: [
      group({ id: 'acme', name: 'Acme', parentGroupId: 'clients', tabOrder: 0 }),
      group({ executionHostId: 'runtime:a', tabOrder: 1 }),
      group({ color: '#123456', tabOrder: 1 }),
      group({ id: 'oss', name: 'Open source', tabOrder: 0 })
    ],
    updateProjectGroups,
    updateSettings: async (updates) => {
      useAppStore.setState((state) => ({
        settings: state.settings ? { ...state.settings, ...updates } : state.settings
      }))
    }
  })
})
afterEach(cleanup)

describe('SidebarColorsSetting', () => {
  it('lists each group once, in tree order, with nested groups indented', () => {
    render(<SidebarColorsSetting />)
    const rows = screen.getAllByTestId('sidebar-colors-group')
    expect(
      rows.map((row) => [
        within(row).getByText(/./, { selector: 'label' }).textContent,
        row.dataset.depth
      ])
    ).toEqual([
      ['Open source', '0'],
      ['Clients', '0'],
      ['Acme', '1']
    ])
  })

  it('saves a group swatch and its background strength', () => {
    render(<SidebarColorsSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Acme' }))
    expect(updateProjectGroups).toHaveBeenCalledWith([
      { groupId: 'acme', updates: { color: '#22c55e' }, hostId: 'local' }
    ])
    const acme = within(screen.getByRole('radiogroup', { name: 'Background for Acme' }))
    fireEvent.click(acme.getByRole('radio', { name: 'Strong' }))
    expect(useAppStore.getState().settings?.projectGroupTints).toEqual({ acme: 'strong' })
  })

  it('lists configured devices with Automatic, saves a device swatch to hostSettingOverrides, and bounds the list with search and an overflow note', () => {
    configuredDevices.hosts = Array.from({ length: 55 }, (_, index) => ({
      id: `ssh:box-${index}`,
      label: `Box ${index}`
    }))
    render(<SidebarColorsSetting />)
    expect(screen.getAllByRole('button', { name: 'Automatic' })).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Box 3' }))
    expect(useAppStore.getState().settings?.hostSettingOverrides?.['ssh:box-3']?.color).toBe(
      '#22c55e'
    )
    expect(screen.getByRole('textbox', { name: 'Search hosts…' })).toBeTruthy()
    expect(screen.getByText('5 more hosts. Search by name to find one.')).toBeTruthy()
  })
})
