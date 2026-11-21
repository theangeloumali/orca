import type { ExecutionHostId } from '../../execution-host/execution-host'

export type DeviceSection<Item, Host extends { id: ExecutionHostId }> = {
  hostId: ExecutionHostId
  /** Absent when an item names a machine the host list no longer has. */
  host?: Host
  items: Item[]
}

/** Items split by machine: the anchor machine first, then `hosts` order; empty machines are dropped. */
export function groupByExecutionHost<Item, Host extends { id: ExecutionHostId }>(args: {
  items: readonly Item[]
  getHostId: (item: Item) => ExecutionHostId
  hosts: readonly Host[]
  anchorHostId?: ExecutionHostId
}): DeviceSection<Item, Host>[] {
  const itemsByHost = new Map<ExecutionHostId, Item[]>()
  for (const item of args.items) {
    const hostId = args.getHostId(item)
    itemsByHost.set(hostId, [...(itemsByHost.get(hostId) ?? []), item])
  }
  const order = args.hosts.map((host) => host.id)
  for (const hostId of itemsByHost.keys()) {
    if (!order.includes(hostId)) {
      order.push(hostId)
    }
  }
  if (args.anchorHostId && order.includes(args.anchorHostId)) {
    order.splice(order.indexOf(args.anchorHostId), 1)
    order.unshift(args.anchorHostId)
  }
  const hostById = new Map(args.hosts.map((host) => [host.id, host]))
  return order.flatMap((hostId) => {
    const items = itemsByHost.get(hostId)
    return items ? [{ hostId, host: hostById.get(hostId), items }] : []
  })
}
