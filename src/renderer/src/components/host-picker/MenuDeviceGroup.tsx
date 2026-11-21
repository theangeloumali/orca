import React, { useId } from 'react'
import { DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { HostRowIcon } from './host-row-icon'

/** A menu section headed by its machine; with one machine the heading is left out. */
export function MenuDeviceGroup({
  hostId,
  label,
  showHeading,
  note,
  children
}: {
  hostId: ExecutionHostId
  label: string
  showHeading: boolean
  /** Why this machine's rows are unavailable, shown after its name. */
  note?: string
  children: React.ReactNode
}): React.JSX.Element {
  const labelId = useId()
  if (!showHeading) {
    return <>{children}</>
  }
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

/** One headed group per machine section; host lists render here (host-list-render ratchet). */
export function MenuDeviceSections<Section extends { hostId: ExecutionHostId }>({
  sections,
  labels,
  showHeadings,
  noteFor,
  renderItems
}: {
  sections: readonly Section[]
  labels: ReadonlyMap<ExecutionHostId, string>
  showHeadings: boolean
  noteFor: (section: Section) => string | undefined
  renderItems: (section: Section) => React.ReactNode
}): React.JSX.Element {
  return (
    <>
      {sections.map((section) => (
        <MenuDeviceGroup
          key={section.hostId}
          hostId={section.hostId}
          label={labels.get(section.hostId) ?? section.hostId}
          showHeading={showHeadings}
          note={noteFor(section)}
        >
          {renderItems(section)}
        </MenuDeviceGroup>
      ))}
    </>
  )
}
