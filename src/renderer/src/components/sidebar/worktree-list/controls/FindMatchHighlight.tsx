import type { JSX } from 'react'
import { useAppStore } from '@/store/index'
import { findQueryMatchRanges } from '../../../../../../shared/workspace-view/workspace-find-query'

/** A row label with each sidebar-find match marked. */
export function FindMatchHighlight({ text }: { text: string }): JSX.Element {
  const query = useAppStore((s) => s.sidebarFindQuery)
  const ranges = findQueryMatchRanges(text, query)
  if (ranges.length === 0) {
    return <>{text}</>
  }
  const parts: (string | JSX.Element)[] = []
  let cursor = 0
  for (const { start, end } of ranges) {
    parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={start} className="rounded-sm bg-primary/25 text-inherit">
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  }
  parts.push(text.slice(cursor))
  return <>{parts}</>
}
