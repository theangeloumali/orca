import type { CSSProperties } from 'react'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { HostSectionTint } from '../../../../../../shared/execution-host/host-setting-overrides'
import {
  resolveHostColor,
  resolveHostSectionTint
} from '../../../../../../shared/execution-host/host-appearance'
import {
  SIDEBAR_CONTRAST_THEMES,
  hostTintPercents,
  type HostTintPercents,
  type SidebarContrastPalette
} from '../../../../../../shared/execution-host/host-tint-contrast'
import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import type { RenderRow } from '../listing/render-row'
import type { HostHeaderRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'

export type HostRowAppearance = {
  hostId: ExecutionHostId
  color: string
  tint: HostSectionTint
  tintPercents: HostTintPercents
}

type HostColorStyle = CSSProperties & {
  '--host-color': string
  '--host-tint-header': string
  '--host-tint-subtle': string
  '--host-tint-strong': string
  '--host-tint-working': string
}

type AppearanceRow =
  | { type: 'host-header'; hostId: ExecutionHostId }
  | { type: Exclude<RenderRow['type'], 'host-header'> }

/** One pass over the rows; each row shares its host header's appearance object. */
export function buildHostRowAppearance(
  rows: readonly AppearanceRow[],
  settings: Pick<GlobalSettings, 'hostSettingOverrides'> | null | undefined,
  orderedHostIds: readonly string[],
  palettes: readonly SidebarContrastPalette[] | null = SIDEBAR_CONTRAST_THEMES
): (HostRowAppearance | null)[] {
  let current: HostRowAppearance | null = null
  return rows.map((row) => {
    if (row.type === 'host-header') {
      const color = resolveHostColor(settings, row.hostId, orderedHostIds)
      current = color
        ? {
            hostId: row.hostId,
            color,
            tint: resolveHostSectionTint(settings, row.hostId),
            tintPercents: hostTintPercents(color, palettes)
          }
        : null
    }
    return current
  })
}

const UNPAINTED_HEALTH = new Set<HostHeaderRow['health']>(['blocked', 'disconnected', 'suspended'])

/** Blocked, disconnected and suspended headers keep their own state fills, so no color edge or tint. */
export function getHostHeaderPaint(
  appearance: HostRowAppearance | null | undefined,
  health: HostHeaderRow['health']
): { colored: boolean; tinted: boolean } {
  const colored = Boolean(appearance) && !UNPAINTED_HEALTH.has(health)
  return { colored, tinted: colored && appearance?.tint !== 'off' }
}

export function hostColorStyle(
  appearance: HostRowAppearance | null | undefined
): HostColorStyle | undefined {
  if (!appearance) {
    return undefined
  }
  const tint = appearance.tintPercents
  return {
    '--host-color': appearance.color,
    '--host-tint-header': `${tint.header}%`,
    '--host-tint-subtle': `${tint.subtle}%`,
    '--host-tint-strong': `${tint.strong}%`,
    '--host-tint-working': `${tint.working}%`
  }
}
