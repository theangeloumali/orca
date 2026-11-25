import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useSidebarContrastPaletteStore } from '@/store/appearance/sidebar-contrast-palette'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { buildGroupRowAppearance, type GroupRowAppearance } from './group-row-appearance'
import type { HostRowAppearance } from './host-row-appearance'
import { useHostRowAppearance } from './use-host-row-appearance'

type Rows = Parameters<typeof useHostRowAppearance>[0] &
  Parameters<typeof buildGroupRowAppearance>[0]

export type RowAppearance = {
  host: (HostRowAppearance | null)[]
  group: (GroupRowAppearance | null)[]
}

const NO_GROUPS: readonly ProjectGroup[] = []

/** Subscribes to colors and tints only, so title and status writes never rescan the rows. */
export function useRowAppearance(
  renderRows: Rows,
  orderedHosts?: readonly { id: string }[]
): RowAppearance {
  const host = useHostRowAppearance(renderRows, orderedHosts)
  const projectGroups = useAppStore((s) => s.projectGroups ?? NO_GROUPS)
  const projectGroupTints = useAppStore((s) => s.settings?.projectGroupTints)
  const palettes = useSidebarContrastPaletteStore((s) => s.palettes)
  const group = useMemo(
    () => buildGroupRowAppearance(renderRows, projectGroups, projectGroupTints, palettes),
    [renderRows, projectGroups, projectGroupTints, palettes]
  )
  return useMemo(() => ({ host, group }), [host, group])
}
