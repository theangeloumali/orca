import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { toggleCollapsedGroupSet } from '@/store/slices/ui/collapsed-group-toggle'
import { isProjectSectionGroupKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import { withoutProjectKeys } from './filter-scoped-collapse'
import { selectHidesEmptyProjectGroups } from '../controls/sidebar-filter-actions'
import { getVisibleProjectGroupSubtreeKeys } from '../rows/use-project-group-subtree-collapse'
import { toggleProjectGroupSubtreeCollapsed } from './project-group-subtree-collapse'

type FilterSession = { filtering: boolean; folded: ReadonlySet<string> }

const NOTHING_FOLDED: ReadonlySet<string> = new Set()

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
  // While filtering only project keys stay in the session; machine and Pinned folds still save.
  const setCollapsedGroups = useCallback(
    (keys: Set<string>) => {
      if (!filtering) {
        setSaved(keys)
        return
      }
      setSaved(
        new Set([...withoutProjectKeys(keys), ...[...saved].filter(isProjectSectionGroupKey)])
      )
      setSession((current) => ({
        ...current,
        folded: new Set([...keys].filter(isProjectSectionGroupKey))
      }))
    },
    [filtering, saved, setSaved]
  )
  /** Alt-click and the group menu fold a subtree; false means nothing listed sits beneath it. */
  const toggleProjectGroupSubtree = useCallback(
    (groupId: string): boolean => {
      const subtreeKeys = getVisibleProjectGroupSubtreeKeys(useAppStore.getState(), groupId)
      if (subtreeKeys.length === 0) {
        return false
      }
      setCollapsedGroups(toggleProjectGroupSubtreeCollapsed(collapsedGroups, subtreeKeys))
      return true
    },
    [collapsedGroups, setCollapsedGroups]
  )
  return { collapsedGroups, toggleGroup, setCollapsedGroups, toggleProjectGroupSubtree }
}
