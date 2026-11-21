import { isRepoHidden } from '../../../../../../shared/project/catalog/hidden-projects'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'

export type ActiveOnlyProjectSummary = {
  shownCount: number
  totalCount: number
  /** Projects Active only hides while one of their agents waits on the user. */
  hiddenNeedsYouCount: number
}

export function summarizeActiveOnlyProjects(args: {
  repos: readonly Pick<Repo, 'id' | 'hiddenAt'>[]
  workspacesByRepoId: Readonly<
    Record<string, readonly Pick<Worktree, 'id' | 'isArchived'>[] | undefined>
  >
  hasRunningTerminal: (worktreeId: string) => boolean
  needsYouWorktreeIds: ReadonlySet<string>
}): ActiveOnlyProjectSummary {
  // A project registered on two hosts shares one id; count it once.
  const listedRepoIds = new Set(args.repos.filter((repo) => !isRepoHidden(repo)).map((r) => r.id))
  let shownCount = 0
  let hiddenNeedsYouCount = 0
  for (const repoId of listedRepoIds) {
    const worktreeIds = (args.workspacesByRepoId[repoId] ?? [])
      .filter((worktree) => !worktree.isArchived)
      .map((worktree) => worktree.id)
    if (worktreeIds.some(args.hasRunningTerminal)) {
      shownCount += 1
    } else if (worktreeIds.some((id) => args.needsYouWorktreeIds.has(id))) {
      hiddenNeedsYouCount += 1
    }
  }
  return { shownCount, totalCount: listedRepoIds.size, hiddenNeedsYouCount }
}
