import { toast } from 'sonner'
import { useAppStore } from '@/store/index'
import { translate } from '@/i18n/i18n'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
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

/** Saves each host's copy on its own, so an offline host keeps its old color and is named. */
async function saveColorOnEveryCopy(
  groupId: string,
  updates: { color: string | null }
): Promise<void> {
  const { projectGroups, updateProjectGroups } = useAppStore.getState()
  const hostIds = projectGroups
    .filter((group) => group.id === groupId)
    .map((copy) => getRepoExecutionHostId(copy))
  const saved = await Promise.all(
    hostIds.map((hostId) => updateProjectGroups([{ groupId, updates, hostId }]).catch(() => false))
  )
  const failedHostIds = hostIds.filter((_, index) => !saved[index])
  if (failedHostIds.length === 0) {
    return
  }
  const state = useAppStore.getState()
  const host = failedHostIds
    .map((hostId) => selectExecutionHostDisplayLabel(state, hostId))
    .join(', ')
  toast.error(
    translate(
      'auto.components.sidebar.WorktreeList.groupColorHostFailed',
      "Couldn't update the color on {{host}}; it will show the old color there",
      { host }
    )
  )
}

/** What the row shows: its color and the group that owns it (the group itself or a parent). */
export type ShownGroupColor = { color: string | null; ownerGroupId: string }

/** Color syncs to every copy of the group; background strength is this computer's. */
export function useProjectGroupAppearanceControls(
  groupId: string,
  shown: ShownGroupColor
): AppearanceControls {
  const updateSettings = useAppStore((s) => s.updateSettings)
  const tint = useAppStore((s) =>
    resolveProjectGroupRowTint(s.settings?.projectGroupTints, groupId, shown.ownerGroupId)
  )
  const { selected, custom } = getHostColorMenuValue(shown.color ?? HOST_COLOR_NONE)

  const selectColor = (value: string): Promise<void> => {
    const updates = projectGroupColorUpdate(value === HOST_COLOR_NONE ? null : value)
    return updates ? saveColorOnEveryCopy(groupId, updates) : Promise.resolve()
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
