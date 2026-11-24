import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { toggleCollapsedGroupSet } from '@/store/slices/ui/collapsed-group-toggle'
import { isProjectSectionGroupKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import { selectHidesEmptyProjectGroups } from '../controls/sidebar-filter-actions'

type FilterSession = { filtering: boolean; folded: ReadonlySet<string> }

const NOTHING_FOLDED: ReadonlySet<string> = new Set()

function withoutProjectKeys(keys: Iterable<string>): string[] {
  return [...keys].filter((key) => !isProjectSectionGroupKey(key))
}

/** Live, Needs you and find open every project; folds made meanwhile last only that filter session. */
export function useFilterScopedCollapse() {
  const saved = useAppStore((state) => state.collapsedGroups)
  const toggleSaved = useAppStore((state) => state.toggleCollapsedGroup)
  const setSaved = useAppStore((state) => state.setCollapsedGroups)
  const filtering = useAppStore(selectHidesEmptyProjectGroups)
  const [session, setSession] = useState<FilterSession>({ filtering, folded: NOTHING_FOLDED })
  // Why: a new filter session starts with every project open again.
  if (session.filtering !== filtering) {
    setSession({ filtering, folded: NOTHING_FOLDED })
  }
  const collapsedGroups = useMemo(
    () => (filtering ? new Set([...withoutProjectKeys(saved), ...session.folded]) : saved),
    [filtering, saved, session.folded]
  )
  const toggleGroup = useCallback(
    (key: string) => {
      if (!filtering || !isProjectSectionGroupKey(key)) {
        toggleSaved(key)
        return
      }
      setSession((current) => ({
        ...current,
        folded: toggleCollapsedGroupSet(current.folded, key)
      }))
    },
    [filtering, toggleSaved]
  )
  // Collapse-all only moves project keys, so while filtering it stays in the session.
  const setCollapsedGroups = useCallback(
    (keys: Set<string>) => {
      if (!filtering) {
        setSaved(keys)
        return
      }
      setSession((current) => ({
        ...current,
        folded: new Set([...keys].filter(isProjectSectionGroupKey))
      }))
    },
    [filtering, setSaved]
  )
  return { collapsedGroups, toggleGroup, setCollapsedGroups }
}
