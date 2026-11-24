import { create } from 'zustand'
import {
  SIDEBAR_CONTRAST_THEMES,
  type SidebarContrastPalette
} from '../../../../shared/execution-host/host-tint-contrast'

/** The painted sidebar palette host tints are sized against; null means rail-only tints. */
export const useSidebarContrastPaletteStore = create<{
  palettes: readonly SidebarContrastPalette[] | null
}>()(() => ({ palettes: SIDEBAR_CONTRAST_THEMES }))
