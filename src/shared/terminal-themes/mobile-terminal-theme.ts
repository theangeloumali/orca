import type { GlobalSettings } from '../settings/global-settings-types'
import type { RuntimeMobileTerminalTheme } from '../remote-runtime/session-graph/runtime-mobile-session-tab-contracts'
import { normalizeTerminalMinimumContrastRatio } from './terminal-minimum-contrast-settings'
import { resolveTerminalPalette, type TerminalPaletteSettings } from './terminal-theme-selection'
import { hexToRgba } from '../color/rgba-contrast'

export type MobileTerminalThemeSettings = TerminalPaletteSettings &
  Partial<
    Pick<
      GlobalSettings,
      'terminalBackgroundOpacity' | 'terminalCursorOpacity' | 'terminalMinimumContrastRatio'
    >
  >

function isHexColor(value: string | undefined): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

/** The terminal palette a phone draws, from the settings of the host whose terminals it shows. */
export function resolveMobileTerminalTheme(
  settings: MobileTerminalThemeSettings | null | undefined,
  systemPrefersDark: boolean
): RuntimeMobileTerminalTheme | undefined {
  if (!settings) {
    return undefined
  }
  const palette = resolveTerminalPalette(settings, systemPrefersDark)
  // Copy: the opacity writes below must not mutate the shared theme catalog entry.
  const resolvedTheme = palette.theme ? { ...palette.theme } : undefined
  if (!resolvedTheme) {
    return undefined
  }
  if (settings.terminalBackgroundOpacity !== undefined && isHexColor(resolvedTheme.background)) {
    resolvedTheme.background = hexToRgba(
      resolvedTheme.background,
      settings.terminalBackgroundOpacity
    )
  }
  if (settings.terminalCursorOpacity !== undefined && isHexColor(resolvedTheme.cursor)) {
    resolvedTheme.cursor = hexToRgba(resolvedTheme.cursor, settings.terminalCursorOpacity)
  }

  const theme: Record<string, string> = {}
  for (const [key, value] of Object.entries(resolvedTheme)) {
    if (typeof value === 'string') {
      theme[key] = value
    }
  }
  return {
    mode: palette.mode,
    theme: theme as RuntimeMobileTerminalTheme['theme'],
    // Send explicit contrast floor so mobile matches desktop rendering (#10754).
    minimumContrastRatio: normalizeTerminalMinimumContrastRatio(
      settings.terminalMinimumContrastRatio
    )
  }
}
