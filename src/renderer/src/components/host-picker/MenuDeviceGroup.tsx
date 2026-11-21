import React, { useId } from 'react'
import { ServerOff } from 'lucide-react'
import { DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { translateHostDisplayLabel } from '@/runtime/hosts/display/execution-host-label'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import {
  getSidebarHostHealthLabel,
  type SidebarHostOption
} from '../sidebar/worktree-list/controls/sidebar-host-options'
import { HostRowIcon } from './host-row-icon'

/** A menu section headed by its machine; with one machine the heading is left out. */
export function MenuDeviceGroup({
  hostId,
  host,
  showHeading,
  note,
  children
}: {
  hostId: ExecutionHostId
  host?: SidebarHostOption
  showHeading: boolean
  /** Why this machine's rows are unavailable, shown after its name. */
  note?: string
  children: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const labelId = useId()
  if (!showHeading) {
    return <>{children}</>
  }
  const healthy = !host || host.health === 'local' || host.health === 'available'
  const health = healthy
    ? null
    : getSidebarHostHealthLabel(host.health, host.blockedReason, t, host.vmState)
  const detail = [health, note].filter(Boolean).join(' · ')
  return (
    <DropdownMenuGroup aria-labelledby={labelId}>
      <DropdownMenuLabel id={labelId}>
        <span className="flex items-center gap-1.5">
          {healthy ? (
            <HostRowIcon hostId={hostId} className="size-3 shrink-0" />
          ) : (
            <ServerOff className="size-3 shrink-0" aria-hidden />
          )}
          <span className="truncate">{host ? translateHostDisplayLabel(host, t) : hostId}</span>
          {detail ? <span className="shrink-0 font-normal">· {detail}</span> : null}
        </span>
      </DropdownMenuLabel>
      {children}
    </DropdownMenuGroup>
  )
}
