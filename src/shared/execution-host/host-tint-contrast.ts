import { contrastRatio, hexToRgb, mix, type Rgba } from '../color/rgba-contrast'

export const HOST_TINT_LEVELS = ['header', 'subtle', 'strong', 'working'] as const
export type HostTintLevel = (typeof HOST_TINT_LEVELS)[number]
export type HostTintPercents = Readonly<Record<HostTintLevel, number>>

/** Each level's intended tint; a color only gets less when muted text would drop under AA. */
export const HOST_TINT_TARGETS: HostTintPercents = { header: 7, subtle: 4, strong: 7, working: 8 }

type SidebarContrastTheme = { surface: Rgba; muted: Rgba; foreground: Rgba; selectedWash: number }

// Mirrors main.css light and dark sidebar tokens; host-appearance-contrast.test guards drift.
export const SIDEBAR_CONTRAST_THEMES: readonly SidebarContrastTheme[] = [
  {
    surface: hexToRgb('#f5f5f5'),
    muted: hexToRgb('#696969'),
    foreground: hexToRgb('#0a0a0a'),
    selectedWash: 8
  },
  {
    surface: hexToRgb('#2a2a2a'),
    muted: hexToRgb('#acacac'),
    foreground: hexToRgb('#f0f0f0'),
    selectedWash: 10
  }
]
/** Share of foreground host-appearance.css lifts muted text by on a selected tinted card. */
export const SELECTED_MUTED_LIFT = 72
const AA_BODY_TEXT = 4.5

function keepsMutedReadable(color: Rgba, percent: number, theme: SidebarContrastTheme): boolean {
  const tinted = mix(color, theme.surface, percent)
  const selected = mix(theme.foreground, tinted, theme.selectedWash)
  const liftedMuted = mix(theme.foreground, theme.surface, SELECTED_MUTED_LIFT)
  return (
    contrastRatio(theme.muted, tinted) >= AA_BODY_TEXT &&
    contrastRatio(liftedMuted, selected) >= AA_BODY_TEXT
  )
}

function readableTintPercent(color: Rgba, target: number): number {
  for (let percent = target; percent > 0; percent -= 1) {
    if (SIDEBAR_CONTRAST_THEMES.every((theme) => keepsMutedReadable(color, percent, theme))) {
      return percent
    }
  }
  return 0
}

const percentsByColor = new Map<string, HostTintPercents>()

/** Per level, the largest whole tint ≤ its target keeping muted text AA in both themes. */
export function hostTintPercents(hexColor: string): HostTintPercents {
  const cached = percentsByColor.get(hexColor)
  if (cached) {
    return cached
  }
  const color = hexToRgb(hexColor)
  const percents: HostTintPercents = {
    header: readableTintPercent(color, HOST_TINT_TARGETS.header),
    subtle: readableTintPercent(color, HOST_TINT_TARGETS.subtle),
    strong: readableTintPercent(color, HOST_TINT_TARGETS.strong),
    working: readableTintPercent(color, HOST_TINT_TARGETS.working)
  }
  percentsByColor.set(hexColor, percents)
  return percents
}
