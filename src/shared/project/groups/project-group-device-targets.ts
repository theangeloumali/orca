import {
  canonicalExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  type ExecutionHostId
} from '../../execution-host/execution-host'
import { getProjectGroupExecutionHostIdForRows } from '../../sidebar-list/hosts/host-filtering'
import { groupByExecutionHost } from '../../sidebar-list/hosts/device-sections'
import {
  getProjectGroupMoveTargets,
  type ProjectGroupMoveTarget
} from './project-group-move-targets'
import type { ProjectGroup } from './project-group-types'

type DeviceTargetGroup = Pick<
  ProjectGroup,
  'id' | 'name' | 'parentGroupId' | 'tabOrder' | 'connectionId' | 'executionHostId'
>

export type ProjectGroupDeviceTargets = {
  hostId: ExecutionHostId
  /** Only groups in the project's own catalog can take it; the rest are listed for orientation. */
  available: boolean
  groupChoices: ProjectGroupMoveTarget[]
}

/** "Move to group" choices split by machine, each machine's groups as its sidebar tree. */
// SSH hosts keep their groups in this computer's catalog; only a paired server has its own.
function sharesGroupCatalog(hostId: ExecutionHostId, otherHostId: ExecutionHostId): boolean {
  const isRuntime = (id: ExecutionHostId) => parseExecutionHostId(id)?.kind === 'runtime'
  return isRuntime(hostId) || isRuntime(otherHostId)
    ? canonicalExecutionHostId(hostId) === canonicalExecutionHostId(otherHostId)
    : true
}

export function getProjectGroupTargetsByDevice(args: {
  groups: readonly DeviceTargetGroup[]
  hostOrder: readonly ExecutionHostId[]
  ownerHostId: ExecutionHostId
}): ProjectGroupDeviceTargets[] {
  return groupByExecutionHost({
    items: args.groups,
    // Server groups are stamped on adoption, so an unstamped group is this computer's.
    getHostId: (group) => getProjectGroupExecutionHostIdForRows(group, LOCAL_EXECUTION_HOST_ID),
    hostOrder: args.hostOrder,
    anchorHostId: args.ownerHostId
  }).map((section) => ({
    hostId: section.hostId,
    available: sharesGroupCatalog(section.hostId, args.ownerHostId),
    // No group is moving here, so nothing in the tree is blocked.
    groupChoices: getProjectGroupMoveTargets(section.items, '')
  }))
}
