import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { PINNED_GROUP_KEY } from '../../../../../../shared/sidebar-list/sections/group-keys'
import type {
  ClientGroupingHintRow,
  HostSectionRow
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
export { getClientGroupingHintRows } from '../../../../../../shared/project/groups/client-grouping-hints'

/** The first row below the Pinned section, or 0 when nothing is pinned. */
function getBelowPinnedIndex(rows: readonly HostSectionRow[]): number {
  const pinnedIndex = rows.findIndex((row) => row.type === 'header' && row.key === PINNED_GROUP_KEY)
  if (pinnedIndex === -1) {
    return 0
  }
  const end = rows.findIndex(
    (row, index) =>
      index > pinnedIndex && !('sectionKey' in row && row.sectionKey === PINNED_GROUP_KEY)
  )
  return end === -1 ? rows.length : end
}

/** Puts each hint in its own row under its open machine header, so the virtualizer sizes it. */
export function insertClientGroupingHintRows(
  rows: HostSectionRow[],
  hints: ReadonlyMap<ExecutionHostId, ClientGroupingHintRow>
): HostSectionRow[] {
  if (hints.size === 0) {
    return rows
  }
  // A flat list has no machine headers, so this computer's hint leads the projects instead.
  if (!rows.some((row) => row.type === 'host-header')) {
    const hint = hints.get(LOCAL_EXECUTION_HOST_ID)
    if (!hint) {
      return rows
    }
    const index = getBelowPinnedIndex(rows)
    return [...rows.slice(0, index), hint, ...rows.slice(index)]
  }
  return rows.flatMap((row) => {
    const hint = row.type === 'host-header' && !row.collapsed ? hints.get(row.hostId) : undefined
    return hint ? [row, hint] : [row]
  })
}
