import type { Worktree } from '../../../../../../shared/worktree/types'

export type ActiveOnlySummary = {
  shownProjects: number
  totalProjects: number
  shownWorkspaces: number
  totalWorkspaces: number
  hiddenNeedsYouCount: number
}

/** Compare the list with and without Active only; rows are matched by identity, so host copies stay apart. */
export function summarizeActiveOnly(args: {
  shown: readonly Worktree[]
  all: readonly Worktree[]
  sectionKeyOf: (worktree: Worktree) => string
  /** Run on hidden rows only, so the attention pass stays off the shown list. */
  needsYouIds: (hidden: readonly Worktree[]) => ReadonlySet<string>
}): ActiveOnlySummary {
  const { shown, all, sectionKeyOf } = args
  const shownRows = new Set(shown)
  const hidden = all.filter((worktree) => !shownRows.has(worktree))
  const needsYou = hidden.length > 0 ? args.needsYouIds(hidden) : new Set<string>()
  return {
    shownProjects: new Set(shown.map(sectionKeyOf)).size,
    totalProjects: new Set(all.map(sectionKeyOf)).size,
    shownWorkspaces: shown.length,
    totalWorkspaces: all.length,
    hiddenNeedsYouCount: hidden.filter((worktree) => needsYou.has(worktree.id)).length
  }
}
