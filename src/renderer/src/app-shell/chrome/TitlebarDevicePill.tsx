import { useAppStore } from '@/store'
import { useActiveWorktree } from '@/store/workspaces/selection/use-selected-worktree'
import { useRepoById } from '@/store/repos/use-repository-catalog'
import { useSidebarDrawnHosts } from '@/components/sidebar/worktree-list/rows/sidebar-drawn-hosts'
import { translateHostDisplayLabel } from '@/runtime/hosts/display/execution-host-label'
import { resolveTitlebarDevice } from './titlebar-device-host'

/** Names the machine the active workspace runs on, in the same color as its sidebar section. */
export function TitlebarDevicePill(): React.JSX.Element | null {
  const drawn = useSidebarDrawnHosts()
  const hostSettingOverrides = useAppStore((s) => s.settings?.hostSettingOverrides)
  // Host-qualified: workspace ids repeat across twin machines.
  const worktree = useActiveWorktree()
  const repo = useRepoById(worktree?.repoId ?? null) ?? undefined
  const device = resolveTitlebarDevice(worktree ? { worktree, repo } : null, drawn, {
    hostSettingOverrides
  })
  if (!device) {
    return null
  }
  return (
    <span className="ml-2 inline-flex h-5 min-w-0 max-w-40 shrink items-center gap-1.5 rounded-full border border-border px-2 text-[11px] font-medium leading-none text-foreground">
      {device.color ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: device.color }}
        />
      ) : null}
      <span className="truncate">{translateHostDisplayLabel(device.host)}</span>
    </span>
  )
}
