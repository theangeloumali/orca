import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useSidebarContrastPaletteStore } from '@/store/appearance/sidebar-contrast-palette'
import { buildHostRowAppearance, type HostRowAppearance } from './host-row-appearance'

type Rows = Parameters<typeof buildHostRowAppearance>[0]

const NO_HOSTS: readonly { id: string }[] = []

/** Subscribes to host overrides only, so title and status writes never rescan the rows. */
export function useHostRowAppearance(
  renderRows: Rows,
  orderedHosts: readonly { id: string }[] = NO_HOSTS
): (HostRowAppearance | null)[] {
  const hostSettingOverrides = useAppStore((s) => s.settings?.hostSettingOverrides)
  const palettes = useSidebarContrastPaletteStore((s) => s.palettes)
  // Auto colors follow the saved host order, not the visible headers, so filtering never repaints them.
  const orderedHostIds = useMemo(() => orderedHosts.map((host) => host.id), [orderedHosts])
  return useMemo(
    () => buildHostRowAppearance(renderRows, { hostSettingOverrides }, orderedHostIds, palettes),
    [renderRows, hostSettingOverrides, orderedHostIds, palettes]
  )
}
