import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { PINNED_GROUP_KEY } from '../../../../../../shared/sidebar-list/sections/group-keys'
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

/** The first row below the Pinned section, or 0 when nothing is pinned. */
function getBelowPinnedIndex(rows: readonly HostSectionRow[]): number {
  const pinnedIndex = rows.findIndex((row) => row.type === 'header' && row.key === PINNED_GROUP_KEY)
  if (pinnedIndex === -1) {
    return 0
  }
  const end = rows.findIndex(
    (row, index) =>
      index > pinnedIndex && !('sectionKey' in row && row.sectionKey === PINNED_GROUP_KEY)
  )
  return end === -1 ? rows.length : end
}

/** Puts each hint in its own row under its open machine header, so the virtualizer sizes it. */
export function insertClientGroupingHintRows(
  rows: HostSectionRow[],
  hints: ReadonlyMap<ExecutionHostId, ClientGroupingHintRow>
): HostSectionRow[] {
  if (hints.size === 0) {
    return rows
  }
  // A flat list has no machine headers, so this computer's hint leads the projects instead.
  if (!rows.some((row) => row.type === 'host-header')) {
    const hint = hints.get(LOCAL_EXECUTION_HOST_ID)
    if (!hint) {
      return rows
    }
    const index = getBelowPinnedIndex(rows)
    return [...rows.slice(0, index), hint, ...rows.slice(index)]
  }
  return rows.flatMap((row) => {
    const hint = row.type === 'host-header' && !row.collapsed ? hints.get(row.hostId) : undefined
    return hint ? [row, hint] : [row]
  })
}
