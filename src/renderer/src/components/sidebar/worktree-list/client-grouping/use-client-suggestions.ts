import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { HostSectionRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import {
  suggestClientGroups,
  type MachineClientSuggestions
} from '../../../../../../shared/project/groups/client-suggestions'
import {
  getClientGroupingHintRows,
  insertClientGroupingHintRows
} from './client-grouping-hint-rows'

export function useClientSuggestions(): MachineClientSuggestions[] {
  const repos = useAppStore((state) => state.repos)
  const projectGroups = useAppStore((state) => state.projectGroups)
  return useMemo(() => suggestClientGroups({ repos, projectGroups }), [repos, projectGroups])
}

export function useClientGroupingHintRows(rows: HostSectionRow[]): HostSectionRow[] {
  const sections = useClientSuggestions()
  const dismissedKey = useAppStore((state) => state.dismissedClientSuggestionsKey)
  const hints = useMemo(
    () => getClientGroupingHintRows(sections, dismissedKey),
    [sections, dismissedKey]
  )
  return useMemo(() => insertClientGroupingHintRows(rows, hints), [rows, hints])
}
