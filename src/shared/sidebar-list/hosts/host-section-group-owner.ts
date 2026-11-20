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

/** The queued headers that enclose `row`: shallower group headers queued before it. */
export function enclosingPendingHeaders<T extends Row>(pendingRows: readonly T[], row: T): T[] {
  const depth = row.type === 'header' ? (row.projectGroupDepth ?? 0) : 0
  const index = pendingRows.indexOf(row)
  return (index === -1 ? pendingRows : pendingRows.slice(0, index)).filter(
    (pending) => pending.type === 'header' && (pending.projectGroupDepth ?? 0) < depth
  )
}
