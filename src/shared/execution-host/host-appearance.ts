import type { ExecutionHostId } from './execution-host'
import type { GlobalSettings } from '../settings/global-settings-types'
import { normalizeRepoBadgeColor, REPO_COLORS } from '../repository/appearance/repo-badge-color'
import {
  clearHostSettingOverride,
  setHostSettingOverride,
  type HostSectionTint,
  type HostSettingOverrides
} from './host-setting-overrides'

export const HOST_COLOR_NONE = 'none'
export const DEFAULT_HOST_SECTION_TINT: HostSectionTint = 'subtle'
export const HOST_SECTION_TINTS: readonly HostSectionTint[] = ['off', 'subtle', 'strong']

// Neutral gray reads as "no color", so auto presets skip it.
const AUTO_HOST_COLORS = REPO_COLORS.filter((color) => color !== '#737373')

type HostSettingsSlice = Pick<GlobalSettings, 'hostSettingOverrides'>
type HostOverridesMap = Partial<Record<ExecutionHostId, HostSettingOverrides>>

/** User color, else an auto preset by section order; null only when the user chose None. */
export function resolveHostColor(
  settings: HostSettingsSlice | null | undefined,
  hostId: ExecutionHostId,
  orderedHostIds: readonly string[]
): string | null {
  const stored = settings?.hostSettingOverrides?.[hostId]?.color
  if (stored === HOST_COLOR_NONE) {
    return null
  }
  const custom = normalizeRepoBadgeColor(stored)
  if (custom) {
    return custom
  }
  const index = Math.max(orderedHostIds.indexOf(hostId), 0)
  return AUTO_HOST_COLORS[index % AUTO_HOST_COLORS.length] ?? null
}

export function resolveHostSectionTint(
  settings: HostSettingsSlice | null | undefined,
  hostId: ExecutionHostId
): HostSectionTint {
  const stored = settings?.hostSettingOverrides?.[hostId]?.sectionTint
  return HOST_SECTION_TINTS.find((tint) => tint === stored) ?? DEFAULT_HOST_SECTION_TINT
}

/** null stores None; an invalid hex leaves the overrides unchanged. */
export function setHostColor(
  settings: HostSettingsSlice | null | undefined,
  hostId: ExecutionHostId,
  color: string | null
): HostOverridesMap {
  const value = color === null ? HOST_COLOR_NONE : normalizeRepoBadgeColor(color)
  if (!value) {
    return settings?.hostSettingOverrides ?? {}
  }
  return setHostSettingOverride(settings, hostId, 'color', value)
}

export function clearHostColor(
  settings: HostSettingsSlice | null | undefined,
  hostId: ExecutionHostId
): HostOverridesMap {
  return clearHostSettingOverride(settings, hostId, 'color')
}

export function setHostSectionTint(
  settings: HostSettingsSlice | null | undefined,
  hostId: ExecutionHostId,
  tint: HostSectionTint
): HostOverridesMap {
  const current = settings?.hostSettingOverrides ?? {}
  return { ...current, [hostId]: { ...current[hostId], sectionTint: tint } }
}
