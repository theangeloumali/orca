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
