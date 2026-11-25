import { useState } from 'react'
import { View } from 'react-native'
import {
  applyAllChip,
  hasQuickFilterChipOn,
  isThisMachineChipOn,
  toggleThisMachineChip
} from '../../../../src/shared/workspace-view/quick-filter-chips'
import { FilterChip } from '../../components/nav-bar/FilterChip'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { spacing } from '../../theme/mobile-theme'
import type { FilterState } from '../../worktree/workspace-list/workspace-list-types'
import { phoneChipSetters, phoneChipState } from './phone-quick-filter-chips'

type SetFilter = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => void

/** The desktop sidebar's quick filters; they write the same shared filters the desktop reads. */
export function HostQuickFilterChips(props: {
  filters: FilterState
  setFilter: SetFilter
  /** This machine only means something once workspaces sit on two or more. */
  machineCount: number
}) {
  const t = useMobileTranslation()
  const [hostsBeforeThisMachine, setHostsBeforeThisMachine] =
    useState<FilterState['visibleHostIds']>(null)
  const state = phoneChipState(props.filters, hostsBeforeThisMachine)
  const setters = phoneChipSetters(props.setFilter, setHostsBeforeThisMachine)
  const chips = [
    {
      id: 'all',
      label: t('hostScreen.quickFilters.all', 'All'),
      active: !hasQuickFilterChipOn(state),
      onPress: () => applyAllChip(state, setters)
    },
    {
      id: 'live',
      label: t('hostScreen.quickFilters.live', 'Live'),
      active: state.showOnlyRunningTerminals,
      onPress: () => setters.setShowOnlyRunningTerminals(!state.showOnlyRunningTerminals)
    },
    {
      id: 'needsYou',
      label: t('hostScreen.quickFilters.needsYou', 'Needs you'),
      active: state.showOnlyNeedsYou,
      onPress: () => setters.setShowOnlyNeedsYou(!state.showOnlyNeedsYou)
    },
    ...(props.machineCount >= 2
      ? [
          {
            id: 'thisMachine',
            label: t('hostScreen.quickFilters.thisMachine', 'This machine'),
            active: isThisMachineChipOn(state.visibleWorkspaceHostIds),
            onPress: () => toggleThisMachineChip(state, setters)
          }
        ]
      : [])
  ]
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={t('hostScreen.quickFilters.label', 'Quick filters')}
      style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg }}
    >
      {chips.map((chip) => (
        <FilterChip key={chip.id} label={chip.label} active={chip.active} onPress={chip.onPress} />
      ))}
    </View>
  )
}
