import React, { useId } from 'react'
import { DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useHostDisplayLabel } from '@/components/sidebar/worktree-list/controls/use-host-display-label'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { HostRowIcon } from './host-row-icon'

/** A menu section headed by its machine; without a heading it renders its rows alone. */
export function MenuDeviceGroup({
  hostId,
  showHeading,
  note,
  children
}: {
  hostId: ExecutionHostId
  showHeading: boolean
  /** Why this machine's rows are unavailable, shown after its name. */
  note?: string
  children: React.ReactNode
}): React.JSX.Element {
  return showHeading ? (
    <HeadedDeviceGroup hostId={hostId} note={note}>
      {children}
    </HeadedDeviceGroup>
  ) : (
    <>{children}</>
  )
}

function HeadedDeviceGroup({
  hostId,
  note,
  children
}: {
  hostId: ExecutionHostId
  note?: string
  children: React.ReactNode
}): React.JSX.Element {
  const labelId = useId()
  const label = useHostDisplayLabel(hostId)
  return (
    <DropdownMenuGroup aria-labelledby={labelId}>
      <DropdownMenuLabel id={labelId}>
        <span className="flex items-center gap-1.5">
          <HostRowIcon hostId={hostId} className="size-3 shrink-0" />
          <span className="truncate">{label}</span>
          {note ? <span className="shrink-0 font-normal">· {note}</span> : null}
        </span>
      </DropdownMenuLabel>
      {children}
    </DropdownMenuGroup>
  )
}

/** One group per machine section, headed when there is more than one (host-list-render ratchet). */
export function MenuDeviceSections<Section extends { hostId: ExecutionHostId }>({
  sections,
  noteFor,
  renderItems
}: {
  sections: readonly Section[]
  noteFor: (section: Section) => string | undefined
  renderItems: (section: Section) => React.ReactNode
}): React.JSX.Element {
  return (
    <>
      {sections.map((section) => (
        <MenuDeviceGroup
          key={section.hostId}
          hostId={section.hostId}
          showHeading={sections.length > 1}
          note={noteFor(section)}
        >
          {renderItems(section)}
        </MenuDeviceGroup>
      ))}
    </>
  )
}
