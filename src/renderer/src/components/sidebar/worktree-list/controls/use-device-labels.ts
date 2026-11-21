import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import {
  LOCAL_EXECUTION_HOST_ID,
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { getProjectGroupExecutionHostIdForRows } from '../../../../../../shared/sidebar-list/hosts/host-filtering'

/** Each machine that owns a project or group, by its display name (your renames first). */
export function useDeviceLabels(): ReadonlyMap<ExecutionHostId, string> {
  const t = useTranslate()
  return useAppStore(
    useShallow((s) => {
      const hostIds = new Set<ExecutionHostId>([LOCAL_EXECUTION_HOST_ID, ...s.workspaceHostOrder])
      for (const repo of s.repos) {
        hostIds.add(getRepoExecutionHostId(repo))
      }
      for (const group of s.projectGroups) {
        hostIds.add(getProjectGroupExecutionHostIdForRows(group, LOCAL_EXECUTION_HOST_ID))
      }
      return new Map(
        [...hostIds].map((hostId) => [hostId, selectExecutionHostDisplayLabel(s, hostId, { t })])
      )
    })
  )
}

/** The sidebar's saved machine order, for listing devices the way the sidebar does. */
export function useDeviceOrder(): readonly { id: ExecutionHostId }[] {
  return useAppStore(useShallow((s) => s.workspaceHostOrder.map((id) => ({ id }))))
}
