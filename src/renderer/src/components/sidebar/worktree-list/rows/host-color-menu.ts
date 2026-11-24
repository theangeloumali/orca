import {
  AUTO_HOST_COLORS,
  HOST_COLOR_NONE
} from '../../../../../../shared/execution-host/host-appearance'
import { normalizeRepoBadgeColor } from '../../../../../../shared/repository/appearance/repo-badge-color'

export const HOST_COLOR_AUTO = 'auto'

type HostColorMenuValue = { selected: string; custom: string | null }

/** The checked radio value, plus the stored hex when no swatch shows it. */
export function getHostColorMenuValue(stored: string | undefined): HostColorMenuValue {
  if (stored === HOST_COLOR_NONE) {
    return { selected: HOST_COLOR_NONE, custom: null }
  }
  const color = normalizeRepoBadgeColor(stored)
  if (!color) {
    return { selected: HOST_COLOR_AUTO, custom: null }
  }
  const isSwatch = AUTO_HOST_COLORS.some((swatch) => swatch === color)
  return { selected: color, custom: isSwatch ? null : color }
}
