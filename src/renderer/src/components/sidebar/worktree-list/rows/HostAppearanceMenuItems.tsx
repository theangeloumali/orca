import React from 'react'
import { Palette, PaintBucket } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { HostSectionTint } from '../../../../../../shared/execution-host/host-setting-overrides'
import {
  AUTO_HOST_COLORS,
  clearHostColor,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS,
  resolveHostSectionTint,
  setHostColor,
  setHostSectionTint,
  type AutoHostColor
} from '../../../../../../shared/execution-host/host-appearance'
import { getHostColorMenuValue, HOST_COLOR_AUTO } from './host-color-menu'

function ColorDot({ color }: { color: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="size-3 shrink-0 rounded-full border border-border/70"
      style={{ backgroundColor: color }}
    />
  )
}

/** Color and Background submenus for one host section; writes go to this computer's settings. */
export function HostAppearanceMenuItems({
  hostId,
  onCustomColor
}: {
  hostId: ExecutionHostId
  onCustomColor: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)
  const storedColor = useAppStore((s) => s.settings?.hostSettingOverrides?.[hostId]?.color)
  const tint = useAppStore((s) => resolveHostSectionTint(s.settings, hostId))
  const { selected: colorValue, custom: customColor } = getHostColorMenuValue(storedColor)

  const selectColor = (value: string): void => {
    const settings = useAppStore.getState().settings
    const next =
      value === HOST_COLOR_AUTO
        ? clearHostColor(settings, hostId)
        : setHostColor(settings, hostId, value === HOST_COLOR_NONE ? null : value)
    void updateSettings({ hostSettingOverrides: next })
  }

  const selectTint = (value: string): void => {
    const nextTint = HOST_SECTION_TINTS.find((known) => known === value)
    if (nextTint) {
      const settings = useAppStore.getState().settings
      void updateSettings({ hostSettingOverrides: setHostSectionTint(settings, hostId, nextTint) })
    }
  }

  const colorNames: Record<AutoHostColor, string> = {
    '#ef4444': t('auto.components.sidebar.HostSectionHeaderMenu.colorRed', 'Red'),
    '#f97316': t('auto.components.sidebar.HostSectionHeaderMenu.colorOrange', 'Orange'),
    '#eab308': t('auto.components.sidebar.HostSectionHeaderMenu.colorYellow', 'Yellow'),
    '#22c55e': t('auto.components.sidebar.HostSectionHeaderMenu.colorGreen', 'Green'),
    '#14b8a6': t('auto.components.sidebar.HostSectionHeaderMenu.colorTeal', 'Teal'),
    '#8b5cf6': t('auto.components.sidebar.HostSectionHeaderMenu.colorPurple', 'Purple'),
    '#ec4899': t('auto.components.sidebar.HostSectionHeaderMenu.colorPink', 'Pink')
  }

  const tintLabels: Record<HostSectionTint, string> = {
    off: t('auto.components.sidebar.HostSectionHeaderMenu.tintOff', 'Off'),
    subtle: t('auto.components.sidebar.HostSectionHeaderMenu.tintSubtle', 'Subtle'),
    strong: t('auto.components.sidebar.HostSectionHeaderMenu.tintStrong', 'Strong')
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette className="size-3.5" />
          {t('auto.components.sidebar.HostSectionHeaderMenu.color', 'Color')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={colorValue} onValueChange={selectColor}>
            <DropdownMenuRadioItem value={HOST_COLOR_AUTO}>
              {t('auto.components.sidebar.HostSectionHeaderMenu.colorAuto', 'Automatic')}
            </DropdownMenuRadioItem>
            {AUTO_HOST_COLORS.map((color) => (
              <DropdownMenuRadioItem
                key={color}
                value={color}
                aria-label={t(
                  'auto.components.sidebar.HostSectionHeaderMenu.colorSwatch',
                  'Use {{color}} for this device',
                  { color: colorNames[color] }
                )}
              >
                <ColorDot color={color} />
                {colorNames[color]}
              </DropdownMenuRadioItem>
            ))}
            {customColor ? (
              <DropdownMenuRadioItem value={customColor}>
                <ColorDot color={customColor} />
                <span className="font-mono text-xs uppercase">{customColor}</span>
              </DropdownMenuRadioItem>
            ) : null}
            <DropdownMenuRadioItem value={HOST_COLOR_NONE}>
              {t('auto.components.sidebar.HostSectionHeaderMenu.colorNone', 'None')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onCustomColor}>
            {t('auto.components.sidebar.HostSectionHeaderMenu.colorCustom', 'Custom…')}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <PaintBucket className="size-3.5" />
          {t('auto.components.sidebar.HostSectionHeaderMenu.background', 'Background')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={tint} onValueChange={selectTint}>
            {HOST_SECTION_TINTS.map((known) => (
              <DropdownMenuRadioItem key={known} value={known}>
                {tintLabels[known]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  )
}
