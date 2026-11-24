import { contrastRatio, hexToRgb, mix, over, type Rgba } from '../color/rgba-contrast'

export const HOST_TINT_LEVELS = ['header', 'subtle', 'strong', 'working'] as const
export type HostTintLevel = (typeof HOST_TINT_LEVELS)[number]
export type HostTintPercents = Readonly<Record<HostTintLevel, number>>

/** Each level's intended tint; a color only gets less when muted text would drop under AA. */
export const HOST_TINT_TARGETS: HostTintPercents = { header: 7, subtle: 4, strong: 7, working: 8 }

/** Sidebar colors a tint is checked against; `selected` paints over the tinted surface. */
export type SidebarContrastPalette = {
  surface: Rgba
  muted: Rgba
  foreground: Rgba
  selected: Rgba
}

function builtInPalette(
  surface: string,
  muted: string,
  foreground: string,
  washPercent: number
): SidebarContrastPalette {
  const [red, green, blue] = hexToRgb(foreground)
  return {
    surface: hexToRgb(surface),
    muted: hexToRgb(muted),
    foreground: hexToRgb(foreground),
    selected: [red, green, blue, washPercent / 100]
  }
}

// Mirrors main.css light and dark sidebar tokens; host-appearance-contrast.test guards drift.
export const SIDEBAR_CONTRAST_THEMES: readonly SidebarContrastPalette[] = [
  builtInPalette('#f5f5f5', '#696969', '#0a0a0a', 8),
  builtInPalette('#2a2a2a', '#acacac', '#f0f0f0', 10)
]
/** Share of foreground host-appearance.css lifts muted text by on a selected tinted card. */
export const SELECTED_MUTED_LIFT = 72
const AA_BODY_TEXT = 4.5
const RAIL_ONLY: HostTintPercents = { header: 0, subtle: 0, strong: 0, working: 0 }

/** The painted sidebar as one palette, or null when a token does not parse (rail-only tints). */
export function readSidebarContrastPalette(
  readToken: (name: string) => string,
  dark: boolean,
  probe: (value: string) => Rgba | null
): readonly SidebarContrastPalette[] | null {
  const color = (name: string): Rgba | null => probe(readToken(name).trim())
  const surface = color('--worktree-sidebar')
  const muted = color('--muted-foreground')
  const foreground = color('--worktree-sidebar-foreground')
  if (!surface || !muted || !foreground) {
    return null
  }
  // Unset, the selected row washes with the built-in share of foreground, as main.css does.
  const [red, green, blue] = foreground
  const builtInWash = SIDEBAR_CONTRAST_THEMES[dark ? 1 : 0].selected[3]
  const selected: Rgba | null = readToken('--worktree-sidebar-active').trim()
    ? color('--worktree-sidebar-active')
    : [red, green, blue, builtInWash]
  return selected ? [{ surface, muted, foreground, selected }] : null
}

function keepsMutedReadable(
  color: Rgba,
  percent: number,
  palette: SidebarContrastPalette
): boolean {
  const tinted = mix(color, palette.surface, percent)
  const liftedMuted = mix(palette.foreground, palette.surface, SELECTED_MUTED_LIFT)
  return (
    contrastRatio(palette.muted, tinted) >= AA_BODY_TEXT &&
    contrastRatio(liftedMuted, over(palette.selected, tinted)) >= AA_BODY_TEXT
  )
}

function readableTintPercent(
  color: Rgba,
  target: number,
  palettes: readonly SidebarContrastPalette[]
): number {
  for (let percent = target; percent > 0; percent -= 1) {
    if (palettes.every((palette) => keepsMutedReadable(color, percent, palette))) {
      return percent
    }
  }
  return 0
}

const percentsByPalettes = new WeakMap<
  readonly SidebarContrastPalette[],
  Map<string, HostTintPercents>
>()

/** Per level, the largest whole tint ≤ its target keeping muted text AA on every palette. */
export function hostTintPercents(
  hexColor: string,
  palettes: readonly SidebarContrastPalette[] | null = SIDEBAR_CONTRAST_THEMES
): HostTintPercents {
  if (!palettes) {
    return RAIL_ONLY
  }
  const byColor = percentsByPalettes.get(palettes) ?? new Map<string, HostTintPercents>()
  percentsByPalettes.set(palettes, byColor)
  const cached = byColor.get(hexColor)
  if (cached) {
    return cached
  }
  const color = hexToRgb(hexColor)
  const percents: HostTintPercents = {
    header: readableTintPercent(color, HOST_TINT_TARGETS.header, palettes),
    subtle: readableTintPercent(color, HOST_TINT_TARGETS.subtle, palettes),
    strong: readableTintPercent(color, HOST_TINT_TARGETS.strong, palettes),
    working: readableTintPercent(color, HOST_TINT_TARGETS.working, palettes)
  }
  byColor.set(hexColor, percents)
  return percents
}
