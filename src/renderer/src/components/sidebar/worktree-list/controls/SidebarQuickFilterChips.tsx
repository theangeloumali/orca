import type { JSX } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  applyAllChip,
  hasQuickFilterChipOn,
  isThisMachineChipOn,
  toggleThisMachineChip,
  type QuickFilterChipSetters,
  type QuickFilterChipState
} from '../../../../../../shared/workspace-view/quick-filter-chips'

type ChipId = 'all' | 'live' | 'needsYou' | 'thisMachine'

function selectChipStore(s: QuickFilterChipState & QuickFilterChipSetters) {
  return {
    showOnlyRunningTerminals: s.showOnlyRunningTerminals,
    showOnlyNeedsYou: s.showOnlyNeedsYou,
    visibleWorkspaceHostIds: s.visibleWorkspaceHostIds,
    hostIdsBeforeThisMachineChip: s.hostIdsBeforeThisMachineChip,
    filterRepoIds: s.filterRepoIds,
    setShowOnlyRunningTerminals: s.setShowOnlyRunningTerminals,
    setShowOnlyNeedsYou: s.setShowOnlyNeedsYou,
    setVisibleWorkspaceHostIds: s.setVisibleWorkspaceHostIds,
    setHostIdsBeforeThisMachineChip: s.setHostIdsBeforeThisMachineChip,
    setFilterRepoIds: s.setFilterRepoIds
  }
}

function activeChipIds(state: QuickFilterChipState): ChipId[] {
  const ids: ChipId[] = []
  if (!hasQuickFilterChipOn(state)) {
    ids.push('all')
  }
  if (state.showOnlyRunningTerminals) {
    ids.push('live')
  }
  if (state.showOnlyNeedsYou) {
    ids.push('needsYou')
  }
  if (isThisMachineChipOn(state.visibleWorkspaceHostIds)) {
    ids.push('thisMachine')
  }
  return ids
}

export function SidebarQuickFilterChips(): JSX.Element {
  const t = useTranslate()
  const store = useAppStore(useShallow(selectChipStore))
  const active = activeChipIds(store)
  const toggleChip: Record<ChipId, () => void> = {
    all: () => applyAllChip(store, store),
    live: () => store.setShowOnlyRunningTerminals(!store.showOnlyRunningTerminals),
    needsYou: () => store.setShowOnlyNeedsYou(!store.showOnlyNeedsYou),
    thisMachine: () => toggleThisMachineChip(store, store)
  }
  const chips: { id: ChipId; label: string }[] = [
    { id: 'all', label: t('auto.components.sidebar.quickFilters.all', 'All') },
    { id: 'live', label: t('auto.components.sidebar.quickFilters.live', 'Live') },
    { id: 'needsYou', label: t('auto.components.sidebar.quickFilters.needsYou', 'Needs you') },
    {
      id: 'thisMachine',
      label: t('auto.components.sidebar.quickFilters.thisMachine', 'This machine')
    }
  ]
  return (
    <ToggleGroup
      type="multiple"
      size="xs"
      spacing={1}
      density="compact"
      aria-label={t('auto.components.sidebar.quickFilters.label', 'Quick filters')}
      value={active}
      onValueChange={(next) => {
        const flipped = chips.find(({ id }) => next.includes(id) !== active.includes(id))
        if (flipped) {
          toggleChip[flipped.id]()
        }
      }}
    >
      {chips.map((chip) => (
        <ToggleGroupItem key={chip.id} value={chip.id}>
          {chip.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
