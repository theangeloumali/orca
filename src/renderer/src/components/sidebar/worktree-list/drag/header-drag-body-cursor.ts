import { useEffect } from 'react'

type DragBody = { style: { cursor: string; userSelect: string } }

/** Locks the body for a header drag; returns the restore. */
export function applyHeaderDragBodyStyle(
  body: DragBody,
  selection: { removeAllRanges: () => void } | null
): () => void {
  // The press can select header text before the 4px drag threshold; user-select alone keeps it.
  selection?.removeAllRanges()
  const { cursor: prevCursor, userSelect: prevUserSelect } = body.style
  body.style.cursor = 'grabbing'
  body.style.userSelect = 'none'
  return () => {
    body.style.cursor = prevCursor
    body.style.userSelect = prevUserSelect
  }
}

export function useHeaderDragBodyCursor(dragging: boolean): void {
  useEffect(() => {
    if (!dragging) {
      return
    }
    return applyHeaderDragBodyStyle(document.body, window.getSelection())
  }, [dragging])
}
