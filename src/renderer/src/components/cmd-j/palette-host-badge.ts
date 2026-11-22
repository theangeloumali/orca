import {
  isLocalExecutionHost,
  type ExecutionHostId
} from '../../../../shared/execution-host/execution-host'
import type { SidebarHostOption } from '../sidebar/worktree-list/controls/sidebar-host-options'
import { translateHostDisplayLabel } from '../../runtime/hosts/display/execution-host-label'

export type PaletteHostBadge = {
  hostId: ExecutionHostId
  label: string
}

export type PaletteHostBadgeContext = {
  hostOptions: readonly SidebarHostOption[]
  // Filtered rows need their host label to explain inclusion, this computer's included.
  hostFilterActive: boolean
  machineCount: number
}

// Same rule as the sidebar's device chip: only another machine's rows, and only once 2+ machines exist.
export function getPaletteHostBadge(
  hostId: ExecutionHostId | null | undefined,
  { hostOptions, hostFilterActive, machineCount }: PaletteHostBadgeContext
): PaletteHostBadge | null {
  const host = hostOptions.find((option) => option.id === hostId)
  if (!host) {
    return null
  }
  if (!hostFilterActive && (isLocalExecutionHost(host.id) || machineCount < 2)) {
    return null
  }
  return { hostId: host.id, label: translateHostDisplayLabel(host) }
}
