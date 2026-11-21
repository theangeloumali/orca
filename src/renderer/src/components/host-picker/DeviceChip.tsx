import React from 'react'
import { Server } from 'lucide-react'

/** The machine a list row lives on; render it only for another machine's row (see getDeviceLabel). */
export function DeviceChip({ label }: { label: string | null }): React.JSX.Element | null {
  if (!label) {
    return null
  }
  return (
    <span className="inline-flex max-w-24 shrink-0 items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">
      <Server className="size-2.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}
