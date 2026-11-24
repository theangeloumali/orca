import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { ClientGroupingHintRow } from '../../sidebar-list/hosts/client-grouping-hint-row'
import { getRepoRowIdentitiesKey, isIdleHintDismissed } from '../catalog/idle-hint-dismissal'
import type { ClientSuggestionRepo, MachineClientSuggestions } from './client-suggestions'

const MIN_HINT_GROUP_SIZE = 3

/** The machine's suggested projects; a dismissal holds until one not in it is suggested. */
function getSuggestionsKey<R extends ClientSuggestionRepo>(
  section: MachineClientSuggestions<R>
): string {
  return getRepoRowIdentitiesKey(section.suggestions.flatMap((suggestion) => suggestion.projects))
}

/** Hint rows for machines with a client of three or more projects that the user has not dismissed. */
export function getClientGroupingHintRows<R extends ClientSuggestionRepo>(
  sections: readonly MachineClientSuggestions<R>[],
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
