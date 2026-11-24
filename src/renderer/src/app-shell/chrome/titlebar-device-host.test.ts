import { describe, expect, it } from 'vitest'
import type { SidebarDrawnHosts } from '@/components/sidebar/worktree-list/rows/sidebar-drawn-hosts'
import { buildHostRowAppearance } from '@/components/sidebar/worktree-list/rows/host-row-appearance'
import { orderHostSectionOptions } from '../../../../shared/sidebar-list/hosts/host-section-order'
import type { HostSectionOption } from '../../../../shared/sidebar-list/hosts/host-section-rows'
import { resolveTitlebarDevice } from './titlebar-device-host'

const sshHost = (id: `ssh:${string}`, label: string): HostSectionOption => ({
  id,
  kind: 'ssh',
  label,
  detail: '',
  health: 'available'
})
const local: HostSectionOption = {
  id: 'local',
  kind: 'local',
  label: 'This Mac',
  detail: '',
  health: 'local'
}
const m1 = sshHost('ssh:m1', 'M1')
const nas = sshHost('ssh:nas', 'NAS')
const drawnOn = (hosts: SidebarDrawnHosts['hosts']): SidebarDrawnHosts => ({
  hosts,
  defaultHostId: 'local'
})
const sshRepo = { connectionId: null, executionHostId: 'ssh:m1' as const }
const onM1 = { worktree: { hostId: 'ssh:m1' as const }, repo: undefined }

describe('titlebar device host', () => {
  it('follows the active workspace to its host', () => {
    expect(resolveTitlebarDevice(onM1, drawnOn([local, m1]), null)?.host).toBe(m1)
    const byRepo = { worktree: {}, repo: sshRepo }
    expect(resolveTitlebarDevice(byRepo, drawnOn([local, m1]), null)?.host).toBe(m1)
  })

  it('a workspace with no hostId stamp still shows the default host', () => {
    const unstamped = { worktree: {}, repo: undefined }
    expect(resolveTitlebarDevice(unstamped, drawnOn([local, m1]), null)?.host).toBe(local)
    const focusedM1 = { hosts: [local, m1], defaultHostId: 'ssh:m1' as const }
    expect(resolveTitlebarDevice(unstamped, focusedM1, null)?.host).toBe(m1)
  })

  it('hides with one host, no active workspace, no drawn sidebar, or an unknown host', () => {
    expect(resolveTitlebarDevice(onM1, drawnOn([m1]), null)).toBeNull()
    expect(resolveTitlebarDevice(null, drawnOn([local, m1]), null)).toBeNull()
    expect(resolveTitlebarDevice(onM1, null, null)).toBeNull()
    const gone = { worktree: { hostId: 'ssh:gone' as const }, repo: undefined }
    expect(resolveTitlebarDevice(gone, drawnOn([local, m1]), null)).toBeNull()
  })

  it('gives each host the color its sidebar header has after a reorder', () => {
    const reordered = orderHostSectionOptions([local, m1, nas], ['ssh:nas', 'local', 'ssh:m1'])
    const headers = reordered.map((host) => ({ type: 'host-header' as const, hostId: host.id }))
    const sidebar = buildHostRowAppearance(
      headers,
      null,
      reordered.map((host) => host.id)
    )
    reordered.forEach((host, index) => {
      const active = { worktree: { hostId: host.id }, repo: undefined }
      expect(resolveTitlebarDevice(active, drawnOn(reordered), null)?.color).toBe(
        sidebar[index]?.color
      )
    })
  })
})
