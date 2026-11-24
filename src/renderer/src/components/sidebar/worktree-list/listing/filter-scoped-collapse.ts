import type { AppState } from '@/store/types'
import { isProjectSectionGroupKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import { selectHidesEmptyProjectGroups } from '../controls/sidebar-filter-actions'

type FilterScopedCollapseState = Pick<AppState, 'collapsedGroups'> &
  Parameters<typeof selectHidesEmptyProjectGroups>[0]

export function withoutProjectKeys(keys: Iterable<string>): string[] {
  return [...keys].filter((key) => !isProjectSectionGroupKey(key))
}

/** Saved folds as filters draw them: Live, Needs you and find open every project. */
export function selectFilterScopedSavedCollapse(state: FilterScopedCollapseState): Set<string> {
  return selectHidesEmptyProjectGroups(state)
    ? new Set(withoutProjectKeys(state.collapsedGroups))
    : state.collapsedGroups
}
