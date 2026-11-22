import { useCallback, useEffect, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { selectSidebarFilterState, sidebarHasActiveFilters } from './sidebar-filter-actions'
import { countRepoMachines } from './sidebar-quick-filter-chips'
import { SidebarClientFilterMenu } from './SidebarClientFilterMenu'
import { SidebarFindField } from './SidebarFindField'
import { SidebarQuickFilterChips } from './SidebarQuickFilterChips'
import { useSidebarFindShortcut } from './use-sidebar-find-shortcut'

function FindButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const t = useTranslate()
  const findLabel = t('auto.components.sidebar.quickFilters.find', 'Find in sidebar')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="muted-field-icon"
          size="icon-xs"
          className={className}
          aria-label={findLabel}
          onClick={onClick}
        >
          <Search className="size-3" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {findLabel}
      </TooltipContent>
    </Tooltip>
  )
}

/** Chips and find under the Projects header; a lone machine with nothing filtered keeps only the header's find button. */
export function SidebarQuickFilterBar({
  findButtonTarget
}: {
  /** Header slot for the find button while the chip row is hidden, so a mouse can still reach find. */
  findButtonTarget?: HTMLElement | null
}): JSX.Element | null {
  const machineCount = useAppStore((s) => countRepoMachines(s.repos))
  const filterState = useAppStore(useShallow(selectSidebarFilterState))
  const query = useAppStore((s) => s.sidebarFindQuery)
  const setQuery = useAppStore((s) => s.setSidebarFindQuery)
  const [findOpen, setFindOpen] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const openFind = useCallback(() => {
    setFindOpen(true)
    setFocusRequest((request) => request + 1)
  }, [])
  const closeFind = useCallback(() => {
    setQuery('')
    setFindOpen(false)
  }, [setQuery])
  useSidebarFindShortcut(openFind)
  // The query is transient: once the field is gone it must not keep filtering unseen.
  useEffect(() => () => setQuery(''), [setQuery])

  const showChips = machineCount >= 2 || sidebarHasActiveFilters(filterState)
  if (!showChips && !findOpen) {
    return findButtonTarget
      ? createPortal(<FindButton onClick={openFind} />, findButtonTarget)
      : null
  }
  return (
    <div className="flex flex-col gap-1 px-2 pb-1" data-sidebar-quick-filters="">
      {showChips ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <SidebarQuickFilterChips />
          <SidebarClientFilterMenu />
          {findOpen ? null : <FindButton onClick={openFind} className="ml-auto" />}
        </div>
      ) : null}
      {findOpen ? (
        <SidebarFindField
          query={query}
          onQueryChange={setQuery}
          onClose={closeFind}
          focusRequest={focusRequest}
        />
      ) : null}
    </div>
  )
}
