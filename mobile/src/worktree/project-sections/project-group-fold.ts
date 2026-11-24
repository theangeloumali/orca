import type { Worktree } from '../workspace-list/workspace-list-types'
import type { GroupTreePlacement } from './project-group-tree-sections'

/** What a folded group header summarises, and the keys its whole subtree folds by. */
export type GroupFold = { projects: number; needsYou: number; subtreeKeys: string[] }

/** Each group's fold over the sections listed beneath it, subgroups included. */
export function buildGroupFolds(
  sections: readonly { key: string; isProjectGroup?: boolean; data: readonly Worktree[] }[],
  placements: ReadonlyMap<string, GroupTreePlacement>,
  needsYou: (row: Worktree) => boolean
): Map<string, GroupFold> {
  const folds = new Map<string, GroupFold>()
  for (const section of sections) {
    for (const groupKey of placements.get(section.key)?.ancestorKeys ?? []) {
      const fold = folds.get(groupKey) ?? { projects: 0, needsYou: 0, subtreeKeys: [] }
      fold.subtreeKeys.push(section.key)
      if (!section.isProjectGroup) {
        fold.projects += 1
        fold.needsYou += section.data.filter(needsYou).length
      }
      folds.set(groupKey, fold)
    }
  }
  return folds
}

/** The section with its group's fold attached, when it heads one. */
export function withGroupFold<S extends { key: string }>(
  section: S,
  folds: ReadonlyMap<string, GroupFold>
): S & { groupFold?: GroupFold } {
  const groupFold = folds.get(section.key)
  return groupFold ? { ...section, groupFold } : section
}

// Expands only when everything beneath is already folded, like the desktop's subtree toggle.
export function isSubtreeFolded(keys: readonly string[], collapsed: ReadonlySet<string>): boolean {
  return keys.length > 0 && keys.every((key) => collapsed.has(key))
}
