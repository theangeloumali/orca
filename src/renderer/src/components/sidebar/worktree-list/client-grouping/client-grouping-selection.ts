import type { MachineClientSuggestions } from '../../../../../../shared/project/groups/client-suggestions'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'

export type GroupCheckState = boolean | 'indeterminate'

export function getAllSuggestedIdentities(
  sections: readonly MachineClientSuggestions[]
): Set<string> {
  return new Set(
    sections.flatMap((section) =>
      section.suggestions.flatMap((suggestion) => suggestion.projects.map(getRepoRowIdentity))
    )
  )
}

export function getGroupCheckState(
  projects: readonly Repo[],
  selected: ReadonlySet<string>
): GroupCheckState {
  const tickedCount = projects.filter((entry) => selected.has(getRepoRowIdentity(entry))).length
  if (tickedCount === 0) {
    return false
  }
  return tickedCount === projects.length ? true : 'indeterminate'
}

/** A fully ticked group clears; a partly ticked or empty one ticks every project. */
export function toggleGroupSelection(
  projects: readonly Repo[],
  selected: ReadonlySet<string>
): Set<string> {
  const next = new Set(selected)
  const clear = getGroupCheckState(projects, selected) === true
  for (const entry of projects) {
    const identity = getRepoRowIdentity(entry)
    if (clear) {
      next.delete(identity)
    } else {
      next.add(identity)
    }
  }
  return next
}

export function toggleProjectSelection(entry: Repo, selected: ReadonlySet<string>): Set<string> {
  const next = new Set(selected)
  const identity = getRepoRowIdentity(entry)
  if (!next.delete(identity)) {
    next.add(identity)
  }
  return next
}
