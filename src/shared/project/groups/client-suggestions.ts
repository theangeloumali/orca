import { getRepoExecutionHostId, type ExecutionHostId } from '../../execution-host/execution-host'
import { splitGitRemoteKey } from '../../git/remotes/git-remote-identity'
import { getRepoHostIdentity } from '../../repository/repo-host-identity'
import type { Repo } from '../../repository/repo-types'
import { groupByExecutionHost } from '../../sidebar-list/hosts/device-sections'
import { isRepoHidden } from '../catalog/hidden-projects'
import type { ProjectGroup } from './project-group-types'

export type ClientSuggestion = {
  clientName: string
  /** A same-named group already on this machine; the projects are filed into it. */
  existingGroupId: string | null
  projects: Repo[]
}

export type MachineClientSuggestions = { hostId: ExecutionHostId; suggestions: ClientSuggestion[] }

const WORK_FOLDER = 'Work'
const MIN_NEW_GROUP_SIZE = 2

/** The folder under `…/Work/<Client>/…`, else the remote's owner; null when neither names one. */
export function getClientName(repo: Pick<Repo, 'path' | 'gitRemoteIdentity'>): string | null {
  const segments = repo.path.split(/[\\/]+/).filter(Boolean)
  const workIndex = segments.lastIndexOf(WORK_FOLDER)
  // The last segment is the project itself, so it cannot be its own client.
  if (workIndex !== -1 && workIndex + 1 < segments.length - 1) {
    return segments[workIndex + 1]
  }
  const tail = splitGitRemoteKey(repo.gitRemoteIdentity?.canonicalKey, (host) => host)?.tail
  const ownerEnd = tail?.indexOf('/') ?? -1
  return tail && ownerEnd > 0 ? tail.slice(0, ownerEnd) : null
}

function suggestForMachine(
  repos: readonly Repo[],
  groups: readonly ProjectGroup[]
): ClientSuggestion[] {
  const groupByName = new Map(groups.map((entry) => [entry.name.toLowerCase(), entry]))
  const byClient = new Map<string, ClientSuggestion>()
  for (const repo of repos) {
    const clientName = getClientName(repo)
    if (!clientName) {
      continue
    }
    const key = clientName.toLowerCase()
    const existing = byClient.get(key)
    if (existing) {
      existing.projects.push(repo)
      continue
    }
    const match = groupByName.get(key)
    byClient.set(key, {
      clientName: match?.name ?? clientName,
      existingGroupId: match?.id ?? null,
      projects: [repo]
    })
  }
  return [...byClient.values()]
    .filter(
      (suggestion) =>
        suggestion.existingGroupId !== null || suggestion.projects.length >= MIN_NEW_GROUP_SIZE
    )
    .sort(
      (a, b) => b.projects.length - a.projects.length || a.clientName.localeCompare(b.clientName)
    )
}

/** Client groups to propose per machine, from its ungrouped, listed projects; nothing is moved here. */
export function suggestClientGroups(args: {
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
}): MachineClientSuggestions[] {
  const seen = new Set<string>()
  const candidates = args.repos.filter((repo) => {
    const identity = getRepoHostIdentity(repo)
    if (isRepoHidden(repo) || repo.projectGroupId || seen.has(identity)) {
      return false
    }
    seen.add(identity)
    return true
  })
  return groupByExecutionHost({
    items: candidates,
    getHostId: getRepoExecutionHostId,
    hostOrder: []
  }).flatMap((section) => {
    const groups = args.projectGroups.filter(
      (entry) => getRepoExecutionHostId(entry) === section.hostId
    )
    const suggestions = suggestForMachine(section.items, groups)
    return suggestions.length > 0 ? [{ hostId: section.hostId, suggestions }] : []
  })
}
