import { useAppStore } from '@/store/index'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import {
  clearHostColor,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS,
  resolveHostSectionTint,
  setHostColor,
  setHostSectionTint
} from '../../../../../../shared/execution-host/host-appearance'
import type { HostSectionTint } from '../../../../../../shared/execution-host/host-setting-overrides'
import { normalizeRepoBadgeColor } from '../../../../../../shared/repository/appearance/repo-badge-color'
import {
  projectGroupColorUpdate,
  resolveProjectGroupTint,
  setProjectGroupTint
} from '../../../../../../shared/project/groups/project-group-appearance'
import { SIDEBAR_COLORS_SETTING_ID } from '../../../settings/appearance/appearance-sidebar-colors-search'
import { getHostColorMenuValue, HOST_COLOR_AUTO } from './host-color-menu'

/** One sidebar color target (a device or a project group), shared by menus and Settings. */
export type AppearanceControls = {
  colorValue: string
  customColor: string | null
  tint: HostSectionTint
  selectColor: (value: string) => void
  selectTint: (value: string) => void
}

const parseTint = (value: string): HostSectionTint | undefined =>
  HOST_SECTION_TINTS.find((known) => known === value)

export function useHostAppearanceControls(hostId: ExecutionHostId): AppearanceControls {
  const updateSettings = useAppStore((s) => s.updateSettings)
  const storedColor = useAppStore((s) => s.settings?.hostSettingOverrides?.[hostId]?.color)
  const tint = useAppStore((s) => resolveHostSectionTint(s.settings, hostId))
  const { selected, custom } = getHostColorMenuValue(storedColor)

  const selectColor = (value: string): void => {
    const settings = useAppStore.getState().settings
    const next =
      value === HOST_COLOR_AUTO
        ? clearHostColor(settings, hostId)
        : setHostColor(settings, hostId, value === HOST_COLOR_NONE ? null : value)
    void updateSettings({ hostSettingOverrides: next })
  }
  const selectTint = (value: string): void => {
    const nextTint = parseTint(value)
    if (nextTint) {
      const settings = useAppStore.getState().settings
      void updateSettings({ hostSettingOverrides: setHostSectionTint(settings, hostId, nextTint) })
    }
  }
  return { colorValue: selected, customColor: custom, tint, selectColor, selectTint }
}

/** Color syncs with the group (via its owner host); background strength is this computer's. */
export function useProjectGroupAppearanceControls(
  groupId: string,
  hostId?: ExecutionHostId
): AppearanceControls {
  const updateProjectGroup = useAppStore((s) => s.updateProjectGroup)
  const updateSettings = useAppStore((s) => s.updateSettings)
  // A group on two machines has a copy per host; the colored copy is the one the sidebar shows.
  const storedColor = useAppStore((s) =>
    s.projectGroups
      ?.filter((group) => group.id === groupId)
      .map((group) => normalizeRepoBadgeColor(group.color))
      .find((color) => color !== null)
  )
  const tint = useAppStore((s) => resolveProjectGroupTint(s.settings?.projectGroupTints, groupId))
  const { selected, custom } = getHostColorMenuValue(storedColor ?? HOST_COLOR_NONE)

  const selectColor = (value: string): void => {
    const update = projectGroupColorUpdate(value === HOST_COLOR_NONE ? null : value)
    if (update) {
      void updateProjectGroup(groupId, update, { hostId })
    }
  }
  const selectTint = (value: string): void => {
    const nextTint = parseTint(value)
    if (nextTint) {
      const tints = useAppStore.getState().settings?.projectGroupTints
      void updateSettings({ projectGroupTints: setProjectGroupTint(tints, groupId, nextTint) })
    }
  }
  return { colorValue: selected, customColor: custom, tint, selectColor, selectTint }
}

export function openSidebarColorsSettings(): void {
  const { openSettingsTarget, openSettingsPage } = useAppStore.getState()
  openSettingsTarget({ pane: 'appearance', repoId: null, sectionId: SIDEBAR_COLORS_SETTING_ID })
  openSettingsPage()
}
