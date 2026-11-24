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
  clearHostColor,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS,
  resolveHostSectionTint,
  setHostColor,
  setHostSectionTint
} from '../../../../../../shared/execution-host/host-appearance'
import {
  normalizeRepoBadgeColor,
  REPO_COLORS
} from '../../../../../../shared/repository/appearance/repo-badge-color'

const AUTO_VALUE = 'auto'

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
  const customColor = normalizeRepoBadgeColor(storedColor)
  const isCustom = customColor !== null && !REPO_COLORS.some((preset) => preset === customColor)
  const colorValue = storedColor === HOST_COLOR_NONE ? HOST_COLOR_NONE : (customColor ?? AUTO_VALUE)

  const selectColor = (value: string): void => {
    const settings = useAppStore.getState().settings
    const next =
      value === AUTO_VALUE
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
            <DropdownMenuRadioItem value={AUTO_VALUE}>
              {t('auto.components.sidebar.HostSectionHeaderMenu.colorAuto', 'Automatic')}
            </DropdownMenuRadioItem>
            {REPO_COLORS.map((color) => (
              <DropdownMenuRadioItem
                key={color}
                value={color}
                aria-label={t(
                  'auto.components.sidebar.HostSectionHeaderMenu.colorSwatch',
                  'Use {{color}} for this device',
                  { color }
                )}
              >
                <ColorDot color={color} />
                <span className="font-mono text-xs uppercase">{color}</span>
              </DropdownMenuRadioItem>
            ))}
            {isCustom && customColor ? (
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
