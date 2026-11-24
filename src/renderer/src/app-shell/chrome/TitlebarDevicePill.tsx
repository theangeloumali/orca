import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useSidebarHostScopeOptions } from '@/components/sidebar/worktree-list/controls/use-sidebar-host-scope-options'
import { translateHostDisplayLabel } from '@/runtime/hosts/display/execution-host-label'
import { orderHostSectionOptions } from '../../../../shared/sidebar-list/hosts/host-section-order'
import { resolveHostColor } from '../../../../shared/execution-host/host-appearance'
import { resolveTitlebarDeviceHostId } from './titlebar-device-host'

/** Names the machine the active workspace runs on, in the same color as its sidebar section. */
export function TitlebarDevicePill(): React.JSX.Element | null {
  const { hostOptions } = useSidebarHostScopeOptions()
  const workspaceHostOrder = useAppStore((s) => s.workspaceHostOrder)
  const hostSettingOverrides = useAppStore((s) => s.settings?.hostSettingOverrides)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const activeWorkspaceExecutionHostId = useAppStore((s) => s.activeWorkspaceExecutionHostId)
  const knownWorktreeHostId = useAppStore((s) =>
    s.activeWorktreeId ? s.getKnownWorktreeById(s.activeWorktreeId)?.hostId : undefined
  )
  const orderedHosts = useMemo(
    () => orderHostSectionOptions(hostOptions, workspaceHostOrder),
    [hostOptions, workspaceHostOrder]
  )
  const hostId = resolveTitlebarDeviceHostId(
    { activeWorktreeId, activeWorkspaceExecutionHostId },
    knownWorktreeHostId,
    orderedHosts
  )
  const host = orderedHosts.find((option) => option.id === hostId)
  if (!host) {
    return null
  }
  const color = resolveHostColor(
    { hostSettingOverrides },
    host.id,
    orderedHosts.map((option) => option.id)
  )
  return (
    <span className="ml-2 inline-flex h-5 min-w-0 max-w-40 shrink items-center gap-1.5 rounded-full border border-border px-2 text-[11px] font-medium leading-none text-foreground">
      {color ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="truncate">{translateHostDisplayLabel(host)}</span>
    </span>
  )
}
