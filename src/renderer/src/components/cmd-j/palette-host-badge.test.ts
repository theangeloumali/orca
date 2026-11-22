import { describe, expect, it } from 'vitest'
import type { SidebarHostOption } from '../sidebar/worktree-list/controls/sidebar-host-options'
import { getPaletteHostBadge } from './palette-host-badge'
import { countPaletteMachines } from './palette-machine-count'

const host = (
  id: SidebarHostOption['id'],
  kind: SidebarHostOption['kind'],
  health: SidebarHostOption['health'] = 'available'
): SidebarHostOption => ({
  id,
  label: id,
  detail: '',
  kind,
  health,
  presence: kind === 'local' ? 'local' : 'project'
})
const hostOptions = [
  host('local', 'local', 'local'),
  host('runtime:m1', 'runtime', 'disconnected'),
  host('ssh:box', 'ssh')
]
const context = (machineCount: number, hostFilterActive = false) => ({
  hostOptions,
  hostFilterActive,
  machineCount
})

describe('getPaletteHostBadge', () => {
  it('leaves this computer unlabelled', () => {
    expect(getPaletteHostBadge('local', context(2))).toBeNull()
  })

  it('names another machine once 2+ machines exist, even while it is disconnected', () => {
    expect(getPaletteHostBadge('runtime:m1', context(2))).toEqual({
      hostId: 'runtime:m1',
      label: 'runtime:m1'
    })
  })

  it('shows no chip with a single machine', () => {
    expect(getPaletteHostBadge('runtime:m1', context(1))).toBeNull()
  })

  it('keeps naming every filtered row, this computer included, while a host filter is on', () => {
    expect(getPaletteHostBadge('local', context(1, true))?.hostId).toBe('local')
    expect(getPaletteHostBadge('runtime:m1', context(1, true))?.hostId).toBe('runtime:m1')
  })

  it('shows nothing for a host it does not know', () => {
    expect(getPaletteHostBadge('ssh:gone', context(3, true))).toBeNull()
  })
})

describe('countPaletteMachines', () => {
  it('counts machines holding projects plus paired runtimes, not configured-only SSH targets', () => {
    const configuredOnly: SidebarHostOption = { ...host('ssh:idle', 'ssh'), presence: 'configured' }
    expect(countPaletteMachines([...hostOptions, configuredOnly], ['local', 'ssh:box'])).toBe(3)
    expect(countPaletteMachines([host('local', 'local', 'local')], ['local'])).toBe(1)
  })

  it('counts a host merged into a paired runtime as that one machine', () => {
    const mergedAway: SidebarHostOption = {
      ...host('ssh:m1', 'ssh'),
      mergedIntoHostId: 'runtime:m1'
    }
    expect(countPaletteMachines([...hostOptions, mergedAway], ['local', 'ssh:m1'])).toBe(2)
  })
})
