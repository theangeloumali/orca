import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import {
  indexExecutionHostsById,
  pickerExecutionHosts
} from '../../../../shared/execution-host/managed-orcad-execution-host'
import type { SidebarHostOption } from '../sidebar/worktree-list/controls/sidebar-host-options'

/** Machines holding projects or workspaces, plus paired runtimes; configured-only SSH targets don't count. */
export function countPaletteMachines(
  hostOptions: readonly SidebarHostOption[],
  projectHostIds: Iterable<ExecutionHostId>
): number {
  const shownHostById = indexExecutionHostsById(hostOptions)
  const machines = new Set<ExecutionHostId>()
  for (const hostId of projectHostIds) {
    machines.add(shownHostById.get(hostId)?.id ?? hostId)
  }
  for (const host of pickerExecutionHosts(hostOptions)) {
    if (host.kind === 'runtime') {
      machines.add(host.id)
    }
  }
  return machines.size
}
