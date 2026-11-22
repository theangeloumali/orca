import { useMemo } from 'react'
import { useAppStore } from '@/store'
import {
  suggestClientGroups,
  type MachineClientSuggestions
} from '../../../../../../shared/project/groups/client-suggestions'
import { getIdleProjectsKey } from '../../hidden-projects/archive-model'

export function useClientSuggestions(): MachineClientSuggestions[] {
  const repos = useAppStore((state) => state.repos)
  const projectGroups = useAppStore((state) => state.projectGroups)
  return useMemo(() => suggestClientGroups({ repos, projectGroups }), [repos, projectGroups])
}

/** The machine's suggested projects; a dismissal holds until one not in it is suggested. */
export function getSuggestionsKey(section: MachineClientSuggestions): string {
  return getIdleProjectsKey(section.suggestions.flatMap((suggestion) => suggestion.projects))
}
