import type { ExecutionHostId } from './execution-host'
import type { GlobalSettings } from '../settings/global-settings-types'
import {
  DEFAULT_REPO_BADGE_COLOR,
  normalizeRepoBadgeColor,
  REPO_COLORS
} from '../repository/appearance/repo-badge-color'
import {
  clearHostSettingOverride,
  setHostSettingOverride,
  type HostSectionTint,
  type HostSettingOverrides
} from './host-setting-overrides'

export const HOST_COLOR_NONE = 'none'
export const DEFAULT_HOST_SECTION_TINT: HostSectionTint = 'subtle'
export const HOST_SECTION_TINTS: readonly HostSectionTint[] = ['off', 'subtle', 'strong']

export type AutoHostColor = Exclude<(typeof REPO_COLORS)[number], typeof DEFAULT_REPO_BADGE_COLOR>

// Neutral gray reads as "no color", so auto presets and swatches skip it.
export const AUTO_HOST_COLORS: readonly AutoHostColor[] = REPO_COLORS.filter(
  (color): color is AutoHostColor => color !== DEFAULT_REPO_BADGE_COLOR
)

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
  const index = orderedHostIds.indexOf(hostId)
  // An unordered host must not borrow the first host's color.
  if (index === -1) {
    return DEFAULT_REPO_BADGE_COLOR
  }
  return AUTO_HOST_COLORS[index % AUTO_HOST_COLORS.length] ?? null
}

/** A host's stored color and known tint, the appearance a paired phone is sent; empty when neither is set. */
export function pickHostAppearance(stored: {
  color?: unknown
  sectionTint?: unknown
}): Pick<HostSettingOverrides, 'color' | 'sectionTint'> {
  const color = typeof stored.color === 'string' && stored.color ? stored.color : undefined
  const sectionTint = HOST_SECTION_TINTS.find((tint) => tint === stored.sectionTint)
  return { ...(color ? { color } : {}), ...(sectionTint ? { sectionTint } : {}) }
}

/** A paired host owns only display labels toward a browser; this browser keeps every other per-host key. */
export function mergeRuntimeHostOverrides(
  local: HostOverridesMap | undefined,
  runtime: HostOverridesMap
): HostOverridesMap {
  // Maps keep string keys typed, which a host-id-keyed record cannot be indexed by.
  const localById = new Map(Object.entries(local ?? {}))
  const runtimeById = new Map(Object.entries(runtime))
  const hostIds = new Set([...localById.keys(), ...runtimeById.keys()])
  const merged = [...hostIds].flatMap((hostId) => {
    const { displayLabel: _hostOwned, ...browserOwned } = localById.get(hostId) ?? {}
    const displayLabel = runtimeById.get(hostId)?.displayLabel
    const overrides = displayLabel ? { ...browserOwned, displayLabel } : browserOwned
    return Object.keys(overrides).length > 0 ? [[hostId, overrides]] : []
  })
  return Object.fromEntries(merged)
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
  if (tint === DEFAULT_HOST_SECTION_TINT) {
    return clearHostSettingOverride(settings, hostId, 'sectionTint')
  }
  const current = settings?.hostSettingOverrides ?? {}
  return { ...current, [hostId]: { ...current[hostId], sectionTint: tint } }
}
