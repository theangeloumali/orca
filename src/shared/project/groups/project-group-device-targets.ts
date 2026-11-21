import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../execution-host/execution-host'
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

export type ProjectGroupDeviceTargets<Host extends { id: ExecutionHostId }> = {
  hostId: ExecutionHostId
  host?: Host
  /** Only the project's own machine can take it; other machines' groups are listed for orientation. */
  available: boolean
  targets: ProjectGroupMoveTarget[]
}

/** "Move to group" choices split by machine, each machine's groups as its sidebar tree. */
export function getProjectGroupTargetsByDevice<Host extends { id: ExecutionHostId }>(args: {
  groups: readonly DeviceTargetGroup[]
  hosts: readonly Host[]
  ownerHostId: ExecutionHostId
}): ProjectGroupDeviceTargets<Host>[] {
  return groupByExecutionHost({
    items: args.groups,
    // Server groups are stamped on adoption, so an unstamped group is this computer's.
    getHostId: (group) => getProjectGroupExecutionHostIdForRows(group, LOCAL_EXECUTION_HOST_ID),
    hosts: args.hosts,
    anchorHostId: args.ownerHostId
  }).map((section) => ({
    hostId: section.hostId,
    host: section.host,
    available: section.hostId === args.ownerHostId,
    // No group is moving here, so nothing in the tree is blocked.
    targets: getProjectGroupMoveTargets(section.items, '')
  }))
}
