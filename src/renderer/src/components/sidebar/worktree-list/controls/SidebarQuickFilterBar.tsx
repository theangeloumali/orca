import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { selectSidebarFilterState, sidebarHasActiveRowFilters } from './sidebar-filter-actions'
import { countRepoMachines } from '../../../../../../shared/workspace-view/quick-filter-chips'
import { SidebarClientFilterMenu } from './SidebarClientFilterMenu'
import { SidebarFindField } from './SidebarFindField'
import { SidebarQuickFilterChips } from './SidebarQuickFilterChips'
import { useSidebarFindShortcut } from './use-sidebar-find-shortcut'

type FindButtonProps = {
  onClick: () => void
  className?: string
  buttonRef: (node: HTMLButtonElement | null) => void
}

function FindButton({ onClick, className, buttonRef }: FindButtonProps) {
  const t = useTranslate()
  const findLabel = t('auto.components.sidebar.quickFilters.find', 'Find in sidebar')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={buttonRef}
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
  const focusBeforeFind = useRef<HTMLElement | null>(null)
  const refocusFindButton = useRef(false)
  const openFind = useCallback(() => {
    // A repeat Cmd+F from the open field must not overwrite where focus came from.
    if (focusBeforeFind.current === null && document.activeElement instanceof HTMLElement) {
      focusBeforeFind.current = document.activeElement
    }
    setFindOpen(true)
    setFocusRequest((request) => request + 1)
  }, [])
  const closeFind = useCallback(() => {
    const previous = focusBeforeFind.current
    focusBeforeFind.current = null
    // The find button that opened find unmounted with it, so its remount takes focus instead.
    if (previous?.isConnected && previous !== document.body) {
      previous.focus()
    } else {
      refocusFindButton.current = true
    }
    setQuery('')
    setFindOpen(false)
  }, [setQuery])
  const findButtonRef = useCallback((node: HTMLButtonElement | null) => {
    if (node && refocusFindButton.current) {
      refocusFindButton.current = false
      node.focus()
    }
  }, [])
  useSidebarFindShortcut(openFind)
  // The query is transient: once the field is gone it must not keep filtering unseen.
  useEffect(() => () => setQuery(''), [setQuery])

  // Find has its own field: typing in it must not pop the chip row in on one machine.
  const showChips = machineCount >= 2 || sidebarHasActiveRowFilters(filterState)
  if (!showChips && !findOpen) {
    return findButtonTarget
      ? createPortal(<FindButton onClick={openFind} buttonRef={findButtonRef} />, findButtonTarget)
      : null
  }
  return (
    <div className="flex flex-col gap-1 px-2 pb-1" data-sidebar-quick-filters="">
      {showChips ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <SidebarQuickFilterChips />
          <SidebarClientFilterMenu />
          {findOpen ? null : (
            <FindButton onClick={openFind} buttonRef={findButtonRef} className="ml-auto" />
          )}
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
