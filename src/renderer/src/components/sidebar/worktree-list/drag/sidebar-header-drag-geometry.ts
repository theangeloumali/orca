function getHeaderDragNumberAttribute(element: HTMLElement, attribute: string): number | undefined {
  const rawValue = element.getAttribute(attribute)
  if (rawValue === null) {
    return undefined
  }
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : undefined
}

export function measureSidebarHeaderDragRect(
  element: HTMLElement,
  container: HTMLElement,
  containerRect: DOMRect,
  sectionEndAttribute: string,
  /** 'drawn' follows sticky pinning, for hit tests; 'layout' is the row's slot, for reordering. */
  position: 'layout' | 'drawn' = 'layout'
): { top: number; bottom: number; sectionBottom: number | undefined } {
  const rect = element.getBoundingClientRect()
  const virtualRow =
    position === 'layout' ? element.closest<HTMLElement>('[data-worktree-virtual-row]') : null
  const virtualRowStart = virtualRow
    ? getHeaderDragNumberAttribute(virtualRow, 'data-worktree-virtual-row-start')
    : undefined
  const top =
    virtualRow && virtualRowStart !== undefined
      ? virtualRowStart + rect.top - virtualRow.getBoundingClientRect().top
      : rect.top - containerRect.top + container.scrollTop
  return {
    top,
    bottom: top + rect.height,
    sectionBottom: getHeaderDragNumberAttribute(element, sectionEndAttribute)
  }
}
