import {
  getRepoExecutionHostId,
  getRepoSshConnectionId,
  type ExecutionHostId
} from '../../execution-host/execution-host'
import { splitGitRemoteKey } from '../../git/remotes/git-remote-identity'
import { getRepoHostIdentity } from '../../repository/repo-host-identity'
import type { Repo } from '../../repository/repo-types'
import { groupByExecutionHost } from '../../sidebar-list/hosts/device-sections'
import { isRepoHidden } from '../catalog/hidden-projects'
import type { ProjectGroup } from './project-group-types'

/** The repo fields suggestions read; the desktop passes full repos, the phone its catalog rows. */
export type ClientSuggestionRepo = Pick<
  Repo,
  | 'id'
  | 'path'
  | 'gitRemoteIdentity'
  | 'projectGroupId'
  | 'hiddenAt'
  | 'connectionId'
  | 'executionHostId'
>

export type ClientSuggestion<R extends ClientSuggestionRepo = Repo> = {
  clientName: string
  /** A same-named group already on this machine; the projects are filed into it. */
  existingGroupId: string | null
  projects: R[]
}

export type MachineClientSuggestions<R extends ClientSuggestionRepo = Repo> = {
  hostId: ExecutionHostId
  suggestions: ClientSuggestion<R>[]
}

const WORK_FOLDER = 'work'
// A user named "work" (/home/work, C:\Users\work) is a home dir, not a client container.
const HOME_ROOT_FOLDERS = new Set(['home', 'users'])
const MIN_NEW_GROUP_SIZE = 2

type ClientSource = { name: string; fromPath: boolean }

function getClientSource(repo: Pick<Repo, 'path' | 'gitRemoteIdentity'>): ClientSource | null {
  const segments = repo.path.split(/[\\/]+/).filter(Boolean)
  // Why: the first Work folder names the client; a nested "work" dir belongs to the project.
  const workIndex = segments.findIndex(
    (segment, index) =>
      segment.toLowerCase() === WORK_FOLDER &&
      !HOME_ROOT_FOLDERS.has(segments[index - 1]?.toLowerCase() ?? '')
  )
  // The last segment is the project itself, so it cannot be its own client.
  if (workIndex !== -1 && workIndex + 1 < segments.length - 1) {
    return { name: segments[workIndex + 1], fromPath: true }
  }
  const tail = splitGitRemoteKey(repo.gitRemoteIdentity?.canonicalKey, (host) => host)?.tail
  const ownerEnd = tail?.indexOf('/') ?? -1
  return tail && ownerEnd > 0 ? { name: tail.slice(0, ownerEnd), fromPath: false } : null
}

/** The folder under `…/Work/<Client>/…`, else the remote's owner; null when neither names one. */
export function getClientName(repo: Pick<Repo, 'path' | 'gitRemoteIdentity'>): string | null {
  return getClientSource(repo)?.name ?? null
}

function suggestForMachine<R extends ClientSuggestionRepo>(
  repos: readonly R[],
  groups: readonly ProjectGroup[]
): ClientSuggestion<R>[] {
  // Why: only top-level groups match, so a client's projects never land inside Archive or a subgroup.
  const groupByName = new Map(
    groups
      .filter((entry) => entry.parentGroupId === null)
      .map((entry) => [entry.name.toLowerCase(), entry])
  )
  const byClient = new Map<string, ClientSuggestion<R>>()
  const pathNamed = new Set<string>()
  for (const repo of repos) {
    const source = getClientSource(repo)
    if (!source) {
      continue
    }
    const key = source.name.toLowerCase()
    const match = groupByName.get(key)
    const existing = byClient.get(key)
    if (existing) {
      existing.projects.push(repo)
      // Why: a folder keeps the user's capitalisation; GitHub owners are often lowercase.
      if (!match && source.fromPath && !pathNamed.has(key)) {
        existing.clientName = source.name
      }
    } else {
      byClient.set(key, {
        clientName: match?.name ?? source.name,
        existingGroupId: match?.id ?? null,
        projects: [repo]
      })
    }
    if (source.fromPath) {
      pathNamed.add(key)
    }
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
export function suggestClientGroups<R extends ClientSuggestionRepo = Repo>(args: {
  repos: readonly R[]
  projectGroups: readonly ProjectGroup[]
}): MachineClientSuggestions<R>[] {
  const seen = new Set<string>()
  const candidates = args.repos.filter((repo) => {
    // Why: a paired server's nested-SSH twins share a host identity; their SSH target tells them apart.
    const identity = JSON.stringify([getRepoHostIdentity(repo), getRepoSshConnectionId(repo)])
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
