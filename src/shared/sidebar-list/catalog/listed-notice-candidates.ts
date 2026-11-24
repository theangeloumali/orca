import type { SidebarRowPlanInputs } from '../sidebar-row-plan'

type NoticeCandidates = Pick<
  SidebarRowPlanInputs,
  'importedWorktreesByRepo' | 'newExternalWorktreesInboxByRepo'
>

function onlyListedRepos<V>(byRepo: ReadonlyMap<string, V>, listed: ReadonlySet<string>) {
  return new Map([...byRepo].filter(([repoId]) => listed.has(repoId)))
}

/** Active only: a notice alone must not open a project section with nothing listed in it. */
export function getListedNoticeCandidates(inputs: SidebarRowPlanInputs): NoticeCandidates {
  if (!inputs.hideEmptyProjectGroups) {
    return inputs
  }
  const listedRepoIds = new Set([
    ...inputs.worktrees.map((worktree) => worktree.repoId),
    ...inputs.pendingCreations.map((creation) => creation.repoId)
  ])
  return {
    importedWorktreesByRepo: onlyListedRepos(inputs.importedWorktreesByRepo, listedRepoIds),
    newExternalWorktreesInboxByRepo: onlyListedRepos(
      inputs.newExternalWorktreesInboxByRepo,
      listedRepoIds
    )
  }
}
