import { describe, expect, it } from 'vitest'
import { REPO_COLORS } from '../repository/appearance/repo-badge-color'
import { contrastRatio, hexToRgb, mix, over } from '../color/rgba-contrast'
import {
  HOST_TINT_LEVELS,
  SELECTED_MUTED_LIFT,
  hostTintPercents,
  readSidebarContrastPalette,
  type SidebarContrastPalette
} from './host-tint-contrast'

const AA_BODY_TEXT = 4.5
const HOST_COLORS = [...REPO_COLORS, '#ff0000', '#000000', '#ffffff', '#00ff00']
// A plugin theme's mid-grey sidebar: muted text barely clears AA before any tint.
const MID_GREY: SidebarContrastPalette = {
  surface: hexToRgb('#808080'),
  muted: hexToRgb('#000000'),
  foreground: hexToRgb('#000000'),
  selected: [255, 255, 255, 0.1]
}

const hexProbe = (value: string) => (/^#[\da-f]{6}$/i.test(value) ? hexToRgb(value) : null)
const tokenReader = (tokens: Record<string, string>) => (name: string) => tokens[name] ?? ''
const PAINTED = {
  '--worktree-sidebar': '#808080',
  '--muted-foreground': '#000000',
  '--worktree-sidebar-foreground': '#000000'
}

describe('host tint contrast', () => {
  it('keeps muted text AA on a plugin palette with a mid-grey sidebar', () => {
    const liftedMuted = mix(MID_GREY.foreground, MID_GREY.surface, SELECTED_MUTED_LIFT)
    const ratios = HOST_COLORS.flatMap((color) =>
      HOST_TINT_LEVELS.flatMap((level) => {
        const percent = hostTintPercents(color, [MID_GREY])[level]
        const tinted = mix(hexToRgb(color), MID_GREY.surface, percent)
        return [
          contrastRatio(MID_GREY.muted, tinted),
          contrastRatio(liftedMuted, over(MID_GREY.selected, tinted))
        ]
      })
    )
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
  })

  it('reads the painted sidebar tokens, washing selection with the built-in share when unset', () => {
    expect(readSidebarContrastPalette(tokenReader(PAINTED), false, hexProbe)).toEqual([
      { ...MID_GREY, selected: [0, 0, 0, 0.08] }
    ])
    const washed = { ...PAINTED, '--worktree-sidebar-active': '#202020' }
    expect(readSidebarContrastPalette(tokenReader(washed), true, hexProbe)?.[0].selected).toEqual(
      hexToRgb('#202020')
    )
  })

  it('gives no palette when a painted token cannot be parsed', () => {
    const garbled = { ...PAINTED, '--muted-foreground': 'nonsense' }
    expect(readSidebarContrastPalette(tokenReader(garbled), false, hexProbe)).toBeNull()
  })

  it('falls back to rail-only tints when the live palette could not be parsed', () => {
    expect(hostTintPercents('#ef4444', null)).toEqual({
      header: 0,
      subtle: 0,
      strong: 0,
      working: 0
    })
  })
})
