import { useEffect, useSyncExternalStore } from 'react'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ExecutionHostRegistryEntry } from '../../../../../../shared/execution-host/execution-host-registry-entry'

export type SidebarDrawnHosts = {
  hosts: readonly Pick<ExecutionHostRegistryEntry, 'id' | 'label' | 'isDefaultLocalLabel'>[]
  defaultHostId: ExecutionHostId
}

// The last host list the sidebar drew, so other chrome colors hosts in the same order.
let drawn: SidebarDrawnHosts | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePublishSidebarDrawnHosts(
  hosts: SidebarDrawnHosts['hosts'],
  defaultHostId: ExecutionHostId
): void {
  useEffect(() => {
    if (drawn?.hosts === hosts && drawn.defaultHostId === defaultHostId) {
      return
    }
    drawn = { hosts, defaultHostId }
    listeners.forEach((listener) => listener())
  }, [hosts, defaultHostId])
}

export function useSidebarDrawnHosts(): SidebarDrawnHosts | null {
  return useSyncExternalStore(subscribe, () => drawn)
}
