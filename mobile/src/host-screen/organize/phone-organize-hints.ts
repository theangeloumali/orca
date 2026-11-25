import {
  parseExecutionHostId,
  type ExecutionHostId
} from '../../../../src/shared/execution-host/execution-host'
import { isRepoHidden } from '../../../../src/shared/project/catalog/hidden-projects'
import {
  getRepoRowIdentitiesKey,
  isIdleHintDismissed
} from '../../../../src/shared/project/catalog/idle-hint-dismissal'
import {
  getProjectLastActiveAt,
  isIdleProject
} from '../../../../src/shared/project/catalog/idle-projects'
import { getClientGroupingHintRows } from '../../../../src/shared/project/groups/client-grouping-hints'
import {
  suggestClientGroups,
  type ClientSuggestion
} from '../../../../src/shared/project/groups/client-suggestions'
import type { ProjectGroup } from '../../../../src/shared/project/groups/project-group-types'
import type { SectionRepo, Worktree } from '../../worktree/workspace-list/workspace-list-types'

export type IdleHint = { repos: SectionRepo[]; key: string }

export type ClientHint = {
  hostId: ExecutionHostId
  suggestions: ClientSuggestion<SectionRepo>[]
  projectCount: number
  key: string
}

/** Listed projects untouched for the idle threshold; the phone has no desktop visit times, only activity. */
export function buildIdleHint(
  repos: readonly SectionRepo[],
  rows: readonly Worktree[],
  now: number,
  dismissedKey: string | null
): IdleHint | null {
  const activityByRepo = new Map<string, Parameters<typeof getProjectLastActiveAt>[1][number][]>()
  for (const row of rows) {
    const activity = activityByRepo.get(row.repoId) ?? []
    activity.push({ lastActivityAt: row.lastActivityAt ?? 0, lastVisitedAt: undefined })
    activityByRepo.set(row.repoId, activity)
  }
  const idle = repos.filter(
    (repo) =>
      !isRepoHidden(repo) &&
      repo.addedAt !== undefined &&
      isIdleProject(getProjectLastActiveAt(repo.addedAt, activityByRepo.get(repo.id) ?? []), now)
  )
  const key = getRepoRowIdentitiesKey(idle)
  return idle.length === 0 || isIdleHintDismissed(key, dismissedKey) ? null : { repos: idle, key }
}

/** The first machine the phone can file projects on whose client suggestion is worth offering. */
export function buildClientHint(
  repos: readonly SectionRepo[],
  projectGroups: readonly ProjectGroup[],
  dismissedKey: string | null,
  canFileOn: (hostId: ExecutionHostId) => boolean
): ClientHint | null {
  const machines = suggestClientGroups({ repos, projectGroups }).filter(({ hostId }) =>
    canFileOn(hostId)
  )
  const rows = getClientGroupingHintRows(machines, dismissedKey)
  const machine = machines.find(({ hostId }) => rows.has(hostId))
  const row = machine ? rows.get(machine.hostId) : undefined
  return machine && row
    ? {
        hostId: machine.hostId,
        suggestions: machine.suggestions,
        projectCount: row.projectCount,
        key: row.suggestionsKey
      }
    : null
}

/** A machine whose groups the desktop files directly: this computer or one of its SSH targets. */
export function isDirectlyFileableHost(hostId: ExecutionHostId): boolean {
  return parseExecutionHostId(hostId)?.kind !== 'runtime'
}
