import { useAppStore } from '@/store/index'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import {
  clearHostColor,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS,
  resolveHostSectionTint,
  setHostColor,
  setHostSectionTint
} from '../../../../../../shared/execution-host/host-appearance'
import type { HostSectionTint } from '../../../../../../shared/execution-host/host-setting-overrides'
import {
  projectGroupColorUpdate,
  resolveProjectGroupRowTint,
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

/** What the row shows: its color and the group that owns it (the group itself or a parent). */
export type ShownGroupColor = { color: string | null; ownerGroupId: string }

/** Color syncs to every copy of the group; background strength is this computer's. */
export function useProjectGroupAppearanceControls(
  groupId: string,
  shown: ShownGroupColor
): AppearanceControls {
  const updateProjectGroups = useAppStore((s) => s.updateProjectGroups)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const tint = useAppStore((s) =>
    resolveProjectGroupRowTint(s.settings?.projectGroupTints, groupId, shown.ownerGroupId)
  )
  const { selected, custom } = getHostColorMenuValue(shown.color ?? HOST_COLOR_NONE)

  const selectColor = (value: string): void => {
    const updates = projectGroupColorUpdate(value === HOST_COLOR_NONE ? null : value)
    if (!updates) {
      return
    }
    const copies = useAppStore.getState().projectGroups.filter((group) => group.id === groupId)
    void updateProjectGroups(
      copies.map((copy) => ({ groupId, updates, hostId: getRepoExecutionHostId(copy) }))
    )
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
