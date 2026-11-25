import {
  getRepoExecutionHostId,
  getRepoSshConnectionId,
  type ExecutionHostId
} from '../../../../src/shared/execution-host/execution-host'
import type { ClientSuggestion } from '../../../../src/shared/project/groups/client-suggestions'
import type { SectionRepo } from '../../worktree/workspace-list/workspace-list-types'

type ArchiveParams = { repo: string; repoHostId: ExecutionHostId; hidden: true }

/** Hides each project's own machine copy; resolves how many the desktop took. */
export async function archiveProjects(
  repos: readonly SectionRepo[],
  setHidden: (params: ArchiveParams) => Promise<boolean>
): Promise<number> {
  let archived = 0
  for (const repo of repos) {
    const ok = await setHidden({
      repo: `id:${repo.id}`,
      repoHostId: getRepoExecutionHostId(repo),
      hidden: true
    })
    archived += ok ? 1 : 0
  }
  return archived
}

export type ClientFilingApi = {
  createGroup: (params: { name: string; connectionId: string | null }) => Promise<string | null>
  moveProject: (params: {
    repo: string
    groupId: string
    connectionId: string | null
  }) => Promise<boolean>
}

/** Files each client's projects into its group, making the group first when none exists, one client at a time. */
export async function fileClientSuggestions(
  suggestions: readonly ClientSuggestion<SectionRepo>[],
  api: ClientFilingApi
): Promise<{ filed: number; failedClients: string[] }> {
  let filed = 0
  const failedClients: string[] = []
  for (const suggestion of suggestions) {
    // A machine's suggestions share its SSH target, so the first project names it.
    const connectionId = suggestion.projects[0]
      ? getRepoSshConnectionId(suggestion.projects[0])
      : null
    const groupId =
      suggestion.existingGroupId ??
      (await api.createGroup({ name: suggestion.clientName, connectionId }))
    if (!groupId) {
      failedClients.push(suggestion.clientName)
      continue
    }
    let failed = false
    for (const project of suggestion.projects) {
      const moved = await api.moveProject({ repo: `id:${project.id}`, groupId, connectionId })
      filed += moved ? 1 : 0
      failed ||= !moved
    }
    if (failed) {
      failedClients.push(suggestion.clientName)
    }
  }
  return { filed, failedClients }
}
