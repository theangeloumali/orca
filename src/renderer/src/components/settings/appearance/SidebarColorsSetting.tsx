import React, { useMemo } from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  AUTO_HOST_COLORS,
  HOST_COLOR_NONE,
  HOST_SECTION_TINTS
} from '../../../../../shared/execution-host/host-appearance'
import type { HostSectionTint } from '../../../../../shared/execution-host/host-setting-overrides'
import {
  DEFAULT_REPO_BADGE_COLOR,
  normalizeRepoBadgeColor
} from '../../../../../shared/repository/appearance/repo-badge-color'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { pickerExecutionHosts } from '../../../../../shared/execution-host/managed-orcad-execution-host'
import { translateHostDisplayLabel } from '../../../runtime/hosts/display/execution-host-label'
import { useBoundedHostRows } from '../../host-picker/use-bounded-host-rows'
import { HostListSearchField } from '../../host-picker/HostListSearchField'
import { HostListOverflowNote } from '../../host-picker/HostListOverflowNote'
import { selectEphemeralVmHostLifecycles } from '@/store/slices/ephemeral-vm/ephemeral-vm-lifecycle'
import { buildExecutionHostRegistry } from '../../../../../shared/execution-host/execution-host-registry'
import { getHostDisplayLabelOverrides } from '../../../../../shared/execution-host/host-setting-overrides'
import {
  useHostAppearanceControls,
  useProjectGroupAppearanceControls,
  type AppearanceControls
} from '../../sidebar/worktree-list/rows/appearance-controls'
import { useSidebarColorLabels } from '../../sidebar/worktree-list/rows/AppearanceMenuItems'
import { HOST_COLOR_AUTO } from '../../sidebar/worktree-list/rows/host-color-menu'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsRow, SettingsSegmentedControl } from '../form-controls/SettingsFormControls'
import {
  getSidebarColorsEntry,
  SIDEBAR_COLORS_SETTING_ID
} from './appearance-sidebar-colors-search'
import { orderSidebarColorGroups, type SidebarColorGroup } from './sidebar-colors-groups'

const SWATCH_CLASS =
  'size-6 rounded-[4px] outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50'
const SWATCH_SELECTED_CLASS = 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
const SWATCH_IDLE_CLASS =
  'hover:ring-1 hover:ring-muted-foreground hover:ring-offset-2 hover:ring-offset-background'
const TEXT_CHOICE_CLASS =
  'h-6 rounded-[4px] border border-border px-2 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Every device and project group color on one page; menus deep-link here. */
export function SidebarColorsSetting({
  forceVisible = false
}: {
  forceVisible?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const entry = getSidebarColorsEntry()
  const devices = useColorableHosts()
  const deviceRows = useBoundedHostRows(devices)
  const projectGroups = useAppStore((s) => s.projectGroups)
  const groups = useMemo(() => orderSidebarColorGroups(projectGroups ?? []), [projectGroups])

  return (
    <SearchableSetting
      id={SIDEBAR_COLORS_SETTING_ID}
      title={entry.title}
      description={entry.description}
      keywords={entry.keywords}
      forceVisible={forceVisible}
      className="space-y-1 py-2"
    >
      <div className="space-y-0.5">
        <h4 className="text-sm font-semibold">{entry.title}</h4>
        <p className="text-xs text-muted-foreground">{entry.description}</p>
      </div>
      {deviceRows.searchable ? (
        <HostListSearchField value={deviceRows.query} onChange={deviceRows.setQuery} />
      ) : null}
      {deviceRows.shown.map((device) => (
        <HostColorRow key={device.id} hostId={device.id} name={device.label} />
      ))}
      <HostListOverflowNote hiddenCount={deviceRows.hiddenCount} />
      {groups.length > 0 ? (
        <h5 className="pt-2 text-xs font-medium text-muted-foreground">
          {t('auto.components.settings.SidebarColors.groupsHeading', 'Project groups')}
        </h5>
      ) : null}
      {groups.map((entryGroup) => (
        <GroupColorRow key={entryGroup.group.id} entry={entryGroup} />
      ))}
    </SearchableSetting>
  )
}

/** The registry the sidebar's host sections come from, VM hosts included; no Active Server read. */
function useColorableHosts(): { id: ExecutionHostId; label: string }[] {
  const t = useTranslate()
  const repos = useAppStore((s) => s.repos)
  const settings = useAppStore((s) => s.settings)
  const sshTargetLabels = useAppStore((s) => s.sshTargetLabels)
  const runtimeEnvironments = useAppStore((s) => s.runtimeEnvironments)
  const ephemeralVmHosts = useAppStore(selectEphemeralVmHostLifecycles)
  return useMemo(() => {
    const hosts = buildExecutionHostRegistry({
      repos,
      settings,
      sshTargetLabels,
      runtimeEnvironments,
      hostLabelOverrides: getHostDisplayLabelOverrides(settings),
      ephemeralVmHosts
    })
    return pickerExecutionHosts(hosts).map((host) => ({
      id: host.id,
      label: translateHostDisplayLabel(host, t)
    }))
  }, [repos, settings, sshTargetLabels, runtimeEnvironments, ephemeralVmHosts, t])
}

function HostColorRow({
  hostId,
  name
}: {
  hostId: ExecutionHostId
  name: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <SidebarColorRow
      name={name}
      depth={0}
      controls={useHostAppearanceControls(hostId)}
      autoLabel={t('auto.components.sidebar.HostSectionHeaderMenu.colorAuto', 'Automatic')}
    />
  )
}

function GroupColorRow({ entry }: { entry: SidebarColorGroup }): React.JSX.Element {
  const { group, depth, ownerGroupId } = entry
  const controls = useProjectGroupAppearanceControls(group.id, {
    color: normalizeRepoBadgeColor(group.color),
    ownerGroupId
  })
  return (
    <SidebarColorRow
      name={group.name}
      depth={depth}
      controls={controls}
      testId="sidebar-colors-group"
    />
  )
}

function SidebarColorRow({
  name,
  depth,
  controls,
  autoLabel,
  testId
}: {
  name: string
  depth: number
  controls: AppearanceControls
  /** Devices fall back to an automatic color; groups have none. */
  autoLabel?: string
  testId?: string
}): React.JSX.Element {
  const t = useTranslate()
  const { colorNames, tintLabels } = useSidebarColorLabels()
  const { colorValue, customColor, tint, selectColor, selectTint } = controls
  const choice = (value: string, label: string): React.JSX.Element => (
    <button
      type="button"
      aria-pressed={colorValue === value}
      onClick={() => selectColor(value)}
      className={cn(
        TEXT_CHOICE_CLASS,
        colorValue === value ? 'bg-accent font-medium' : 'text-muted-foreground'
      )}
    >
      {label}
    </button>
  )

  return (
    <div data-testid={testId} data-depth={depth} style={{ paddingLeft: depth * 16 }}>
      <SettingsRow
        label={name}
        control={
          <div className="flex flex-wrap items-center gap-2">
            {autoLabel ? choice(HOST_COLOR_AUTO, autoLabel) : null}
            {AUTO_HOST_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t(
                  'auto.components.settings.SidebarColors.swatch',
                  'Use {{color}} for {{name}}',
                  {
                    color: colorNames[color],
                    name
                  }
                )}
                aria-pressed={colorValue === color}
                onClick={() => selectColor(color)}
                className={cn(
                  SWATCH_CLASS,
                  colorValue === color ? SWATCH_SELECTED_CLASS : SWATCH_IDLE_CLASS
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <ColorPicker
              value={customColor ?? DEFAULT_REPO_BADGE_COLOR}
              onChange={selectColor}
              label={t(
                'auto.components.settings.SidebarColors.custom',
                'Custom color for {{name}}',
                {
                  name
                }
              )}
              selected={customColor !== null}
              triggerLabel={t('auto.components.settings.RepositoryIconPicker.custom', 'Custom')}
              showHexInTrigger={customColor !== null}
            />
            {choice(
              HOST_COLOR_NONE,
              t('auto.components.sidebar.HostSectionHeaderMenu.colorNone', 'None')
            )}
            <SettingsSegmentedControl<HostSectionTint>
              size="sm"
              value={tint}
              onChange={selectTint}
              ariaLabel={t(
                'auto.components.settings.SidebarColors.background',
                'Background for {{name}}',
                {
                  name
                }
              )}
              options={HOST_SECTION_TINTS.map((known) => ({
                value: known,
                label: tintLabels[known]
              }))}
            />
          </div>
        }
      />
    </div>
  )
}
