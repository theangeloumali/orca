import React from 'react'
import { Palette, PaintBucket, SlidersHorizontal } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { HostSectionTint } from '../../../../../../shared/execution-host/host-setting-overrides'
import {
  AUTO_HOST_COLORS,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS,
  type AutoHostColor
} from '../../../../../../shared/execution-host/host-appearance'
import { openSidebarColorsSettings, type AppearanceControls } from './appearance-controls'
import { HOST_COLOR_AUTO } from './host-color-menu'

export function ColorDot({ color }: { color: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="size-3 shrink-0 rounded-full border border-border/70"
      style={{ backgroundColor: color }}
    />
  )
}

/** Swatch and background names shared by the sidebar menus and Settings. */
export function useSidebarColorLabels(): {
  colorNames: Record<AutoHostColor, string>
  tintLabels: Record<HostSectionTint, string>
} {
  const t = useTranslate()
  return {
    colorNames: {
      '#ef4444': t('auto.components.sidebar.HostSectionHeaderMenu.colorRed', 'Red'),
      '#f97316': t('auto.components.sidebar.HostSectionHeaderMenu.colorOrange', 'Orange'),
      '#eab308': t('auto.components.sidebar.HostSectionHeaderMenu.colorYellow', 'Yellow'),
      '#22c55e': t('auto.components.sidebar.HostSectionHeaderMenu.colorGreen', 'Green'),
      '#14b8a6': t('auto.components.sidebar.HostSectionHeaderMenu.colorTeal', 'Teal'),
      '#8b5cf6': t('auto.components.sidebar.HostSectionHeaderMenu.colorPurple', 'Purple'),
      '#ec4899': t('auto.components.sidebar.HostSectionHeaderMenu.colorPink', 'Pink')
    },
    tintLabels: {
      off: t('auto.components.sidebar.HostSectionHeaderMenu.tintOff', 'Off'),
      subtle: t('auto.components.sidebar.HostSectionHeaderMenu.tintSubtle', 'Subtle'),
      strong: t('auto.components.sidebar.HostSectionHeaderMenu.tintStrong', 'Strong')
    }
  }
}

/** Color and Background submenus for one sidebar color target. */
export function AppearanceMenuItems({
  controls,
  autoLabel,
  swatchLabel,
  onCustomColor
}: {
  controls: AppearanceControls
  /** Devices fall back to an automatic color; groups have none. */
  autoLabel?: string
  swatchLabel: (colorName: string) => string
  onCustomColor: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const { colorNames, tintLabels } = useSidebarColorLabels()
  const { colorValue, customColor, tint, selectColor, selectTint } = controls

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette className="size-3.5" />
          {t('auto.components.sidebar.HostSectionHeaderMenu.color', 'Color')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={colorValue} onValueChange={selectColor}>
            {autoLabel ? (
              <DropdownMenuRadioItem value={HOST_COLOR_AUTO}>{autoLabel}</DropdownMenuRadioItem>
            ) : null}
            {AUTO_HOST_COLORS.map((color) => (
              <DropdownMenuRadioItem
                key={color}
                value={color}
                aria-label={swatchLabel(colorNames[color])}
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
      <DropdownMenuItem onSelect={openSidebarColorsSettings}>
        <SlidersHorizontal className="size-3.5" />
        {t('auto.components.sidebar.SidebarColors.editAll', 'Edit all sidebar colors…')}
      </DropdownMenuItem>
    </>
  )
}
