// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { resolveHostSectionTint } from '../../../../../shared/execution-host/host-appearance'
import type { ProjectGroup } from '../../../../../shared/project/groups/project-group-types'
import type { PublicKnownRuntimeEnvironment } from '../../../../../shared/remote-runtime/host-catalog/runtime-environments'
import type { SshConnectionState } from '../../../../../shared/remote-runtime/ssh/ssh-types'
import { SidebarColorsSetting } from './SidebarColorsSetting'

const runtime = (
  overrides: Partial<PublicKnownRuntimeEnvironment>
): PublicKnownRuntimeEnvironment => ({
  id: 'vm-1',
  name: 'Build VM',
  createdAt: 0,
  updatedAt: 0,
  lastUsedAt: null,
  runtimeId: null,
  endpoints: [],
  preferredEndpointId: 'endpoint',
  ...overrides
})

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

const storedHostColor = (hostId: string): string | null | undefined =>
  useAppStore.getState().settings?.hostSettingOverrides?.[hostId]?.color

beforeEach(() => {
  useAppStore.setState({
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settingsSearchQuery: '',
    settings: { ...getDefaultSettings('/home/test'), hostSettingOverrides: {} },
    projectGroups: [
      group({ id: 'acme', name: 'Acme', parentGroupId: 'clients' }),
      group({ executionHostId: 'runtime:a' })
    ],
    // Applies each write to the copy on that host, like the runtime echo does.
    updateProjectGroups: async (mutations) => {
      useAppStore.setState((state) => ({
        projectGroups: state.projectGroups.map((copy) => {
          const write = mutations.find(
            ({ groupId, hostId }) => groupId === copy.id && hostId === getRepoExecutionHostId(copy)
          )
          return write ? { ...copy, color: write.updates.color ?? null } : copy
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

describe('SidebarColorsSetting', () => {
  it('saves a group swatch on the group and its background on this computer', async () => {
    render(<SidebarColorsSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Acme' }))
    await Promise.resolve()
    const acme = useAppStore.getState().projectGroups.find(({ id }) => id === 'acme')
    expect(acme?.color).toBe('#22c55e')
    const background = within(screen.getByRole('radiogroup', { name: 'Background for Acme' }))
    fireEvent.click(background.getByRole('radio', { name: 'Strong' }))
    expect(useAppStore.getState().settings?.projectGroupTints).toEqual({ acme: 'strong' })
  })

  it('bounds the device list at 50 rows and saves a device swatch under its host key', () => {
    useAppStore.setState({
      sshTargetLabels: new Map(
        Array.from({ length: 54 }, (_, index) => [`box-${index}`, `Box ${index}`])
      )
    })
    render(<SidebarColorsSetting />)
    expect(screen.getAllByRole('button', { name: 'Automatic' })).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Box 3' }))
    expect(storedHostColor('ssh:box-3')).toBe('#22c55e')
  })

  it('stores a VM host color and background under its runtime key', () => {
    useAppStore.setState({ runtimeEnvironments: [runtime({ source: 'ephemeral-vm' })] })
    render(<SidebarColorsSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Build VM' }))
    const background = within(screen.getByRole('radiogroup', { name: 'Background for Build VM' }))
    fireEvent.click(background.getByRole('radio', { name: 'Strong' }))
    expect(storedHostColor('runtime:vm-1')).toBe('#22c55e')
    expect(resolveHostSectionTint(useAppStore.getState().settings, 'runtime:vm-1')).toBe('strong')
  })

  it('stores a relay-backed SSH host color under its SSH key, as its sidebar section reads it', () => {
    const relay: SshConnectionState = {
      targetId: 'box',
      status: 'connected',
      error: null,
      reconnectAttempt: 0,
      managedServer: { kind: 'relay', reason: 'refused' }
    }
    useAppStore.setState({
      sshTargetLabels: new Map([['box', 'Box']]),
      sshConnectionStates: new Map([['box', relay]]),
      runtimeEnvironments: [
        runtime({
          id: 'srv',
          name: 'Box server',
          orcadDeployment: {
            sshTargetId: 'box',
            sshTargetGeneration: 1,
            localPort: 4100,
            remotePort: 4101
          }
        })
      ]
    })
    render(<SidebarColorsSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Use Green for Box' }))
    expect(storedHostColor('ssh:box')).toBe('#22c55e')
    expect(storedHostColor('runtime:srv')).toBeUndefined()
  })
})
