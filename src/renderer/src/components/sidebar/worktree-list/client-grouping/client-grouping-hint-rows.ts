import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type {
  ClientGroupingHintRow,
  HostSectionRow
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { MachineClientSuggestions } from '../../../../../../shared/project/groups/client-suggestions'
import { getRepoRowIdentitiesKey, isIdleHintDismissed } from '../../hidden-projects/archive-model'

const MIN_HINT_GROUP_SIZE = 3

/** The machine's suggested projects; a dismissal holds until one not in it is suggested. */
function getSuggestionsKey(section: MachineClientSuggestions): string {
  return getRepoRowIdentitiesKey(section.suggestions.flatMap((suggestion) => suggestion.projects))
}

/** Hint rows for machines with a client of three or more projects that the user has not dismissed. */
export function getClientGroupingHintRows(
  sections: readonly MachineClientSuggestions[],
  dismissedKey: string | null
): Map<ExecutionHostId, ClientGroupingHintRow> {
  const hints = new Map<ExecutionHostId, ClientGroupingHintRow>()
  for (const section of sections) {
    const suggestionsKey = getSuggestionsKey(section)
    if (
      !section.suggestions.some(
        (suggestion) => suggestion.projects.length >= MIN_HINT_GROUP_SIZE
      ) ||
      isIdleHintDismissed(suggestionsKey, dismissedKey)
    ) {
      continue
    }
    hints.set(section.hostId, {
      type: 'client-grouping-hint',
      key: `client-grouping-hint:${section.hostId}`,
      hostId: section.hostId,
      projectCount: section.suggestions.reduce((total, entry) => total + entry.projects.length, 0),
      suggestionsKey
    })
  }
  return hints
}

/** Puts each hint in its own row under its open machine header, so the virtualizer sizes it. */
export function insertClientGroupingHintRows(
  rows: HostSectionRow[],
  hints: ReadonlyMap<ExecutionHostId, ClientGroupingHintRow>
): HostSectionRow[] {
  if (hints.size === 0) {
    return rows
  }
  return rows.flatMap((row) => {
    const hint = row.type === 'host-header' && !row.collapsed ? hints.get(row.hostId) : undefined
    return hint ? [row, hint] : [row]
  })
}
