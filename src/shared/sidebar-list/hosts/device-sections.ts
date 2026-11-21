import { isLocalExecutionHost, type ExecutionHostId } from '../../execution-host/execution-host'
import { getHostContextLabel } from '../../worktree/row-display/host-context-labels'

export type DeviceSection<Item> = { hostId: ExecutionHostId; items: Item[] }

/** Items split by machine: the anchor machine first, then `hostOrder`; empty machines are dropped. */
export function groupByExecutionHost<Item>(args: {
  items: readonly Item[]
  getHostId: (item: Item) => ExecutionHostId
  hostOrder: readonly ExecutionHostId[]
  anchorHostId?: ExecutionHostId
}): DeviceSection<Item>[] {
  const itemsByHost = new Map<ExecutionHostId, Item[]>()
  for (const item of args.items) {
    const hostId = args.getHostId(item)
    const list = itemsByHost.get(hostId)
    if (list) {
      list.push(item)
    } else {
      itemsByHost.set(hostId, [item])
    }
  }
  const known = [...new Set([...args.hostOrder, ...itemsByHost.keys()])]
  const anchor = args.anchorHostId
  const order = anchor ? [anchor, ...known.filter((hostId) => hostId !== anchor)] : known
  return order.flatMap((hostId) => {
    const items = itemsByHost.get(hostId)
    return items ? [{ hostId, items }] : []
  })
}

/** "M1 Max · detail" for another machine's row; this computer's rows stay unlabelled. */
export function withDeviceLabel(
  detail: string,
  hostId: ExecutionHostId,
  hostLabelById: ReadonlyMap<string, string>
): string {
  return isLocalExecutionHost(hostId)
    ? detail
    : `${getHostContextLabel(hostId, { hostLabelById })} · ${detail}`
}
