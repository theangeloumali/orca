import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { Row } from '../row-types'
import { getProjectGroupExecutionHostIdForRows } from './host-filtering'

/** The machine a project-group header belongs to; null for project, lane and "Ungrouped" headers. */
export function getGroupHeaderOwnerHostId(
  row: Row,
  defaultHostId: ExecutionHostId
): ExecutionHostId | null {
  if (row.type !== 'header' || row.repo || !row.projectGroup || row.projectGroup.id === null) {
    return null
  }
  return getProjectGroupExecutionHostIdForRows(row.projectGroup, defaultHostId)
}

/** Pending headers that may head a host's rows: another machine's group never does (#29535). */
export function pendingRowsForHost<T extends Row>(
  pendingRows: readonly T[],
  hostId: ExecutionHostId,
  defaultHostId: ExecutionHostId
): T[] {
  return pendingRows.filter((pending) => {
    const ownerHostId = getGroupHeaderOwnerHostId(pending, defaultHostId)
    return ownerHostId === null || ownerHostId === hostId
  })
}
