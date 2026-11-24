import { useMemo } from 'react'
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId
} from '../../../../src/shared/execution-host/execution-host'
import type { SidebarContrastPalette } from '../../../../src/shared/execution-host/host-tint-contrast'
import { hexToRgb } from '../../../../src/shared/color/rgba-contrast'
import { getHostContextLabel } from '../../../../src/shared/worktree/row-display/host-context-labels'
import { paletteForScheme } from '../../theme/mobile-theme'
import { resolveWorktreeHostId } from '../../worktree/row-presentation/worktree-host-context-labels'
import {
  groupSectionsByMachine,
  machineStatusFromHealth
} from '../../worktree/workspace-list/machine-sections'
import type { HostScreenState } from '../use-host-screen-state'
import type { HostListSections } from './use-host-list-sections'

// Module constant: hostTintPercents caches by this array's identity.
const PHONE_TINT_PALETTES: readonly SidebarContrastPalette[] = (['light', 'dark'] as const).map(
  (scheme) => {
    const palette = paletteForScheme(scheme)
    const [red, green, blue] = hexToRgb(palette.textPrimary)
    return {
      surface: hexToRgb(palette.bgBase),
      muted: hexToRgb(palette.textMuted),
      foreground: hexToRgb(palette.textPrimary),
      selected: [red, green, blue, scheme === 'dark' ? 0.1 : 0.08]
    }
  }
)

/** The list under one header per computer when its rows span several and Machines is on. */
export function useMachineSections(
  state: HostScreenState,
  base: HostListSections
): HostListSections {
  // A view cached before the toggle existed has no value, which reads as on.
  const enabled = state.view.groupByMachine !== false
  const { hostAppearanceById, hostHealthById, hostLabelById, hostPlatform, repoHostIdByRepoId } =
    state
  return useMemo(() => {
    if (!enabled) {
      return base
    }
    const grouped = groupSectionsByMachine({
      sections: base.rawSections,
      collapsedGroups: base.collapsedGroups,
      hostIdOfItem: ({ row }) => resolveWorktreeHostId(row, repoHostIdByRepoId),
      hostIdOfSection: (section) =>
        (section.repo && repoHostIdByRepoId.get(section.repo.id)) || LOCAL_EXECUTION_HOST_ID,
      labelOf: (hostId) => getHostContextLabel(hostId, { hostLabelById, hostPlatform }),
      statusOf: (hostId) =>
        machineStatusFromHealth(
          parseExecutionHostId(hostId)?.kind === 'local' ? 'local' : hostHealthById.get(hostId)
        ),
      overrides: hostAppearanceById,
      palettes: PHONE_TINT_PALETTES
    })
    return grouped ? { ...base, ...grouped } : base
  }, [
    enabled,
    base,
    hostAppearanceById,
    hostHealthById,
    hostLabelById,
    hostPlatform,
    repoHostIdByRepoId
  ])
}
