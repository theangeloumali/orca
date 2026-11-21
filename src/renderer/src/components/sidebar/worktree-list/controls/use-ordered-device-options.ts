import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { orderHostSectionOptions } from '../../../../../../shared/sidebar-list/hosts/host-section-order'
import type { SidebarHostOption } from './sidebar-host-options'
import { useSidebarHostScopeOptions } from './use-sidebar-host-scope-options'

/** Every machine in the sidebar's own order, so menus list devices the way the sidebar does. */
export function useOrderedDeviceOptions(): SidebarHostOption[] {
  const { hostOptions } = useSidebarHostScopeOptions()
  const workspaceHostOrder = useAppStore((s) => s.workspaceHostOrder)
  return useMemo(
    () => orderHostSectionOptions(hostOptions, workspaceHostOrder),
    [hostOptions, workspaceHostOrder]
  )
}
