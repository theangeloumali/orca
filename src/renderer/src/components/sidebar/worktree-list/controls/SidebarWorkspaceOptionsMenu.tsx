import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { useUiLanguageRevision } from '@/i18n/use-ui-language-revision'
import { useAppStore } from '@/store/index'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { WorktreeCardsKeptHintContent } from '../../workspace-card/template/WorktreeCardsIntroNotice'
import { SidebarOptionsPopover } from './SidebarOptionsPopover'
import { ClientGroupingSheet } from '../client-grouping/ClientGroupingSheet'
import {
  useWorkspaceOptionsFilterBadge,
  WorkspaceOptionsMenuItems
} from './workspace-options-menu-items'

const dismissKeptHint = (): void => useAppStore.getState().setWorktreeCardsIntroKeptHintOpen(false)
const openClientGrouping = (): void => useAppStore.getState().setClientGroupingSheetOpen(true)

type SidebarWorkspaceOptionsMenuProps = {
  preserveWorkspaceBoardOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

const SidebarWorkspaceOptionsMenu = React.memo(function SidebarWorkspaceOptionsMenu({
  preserveWorkspaceBoardOpen = false,
  onMenuOpenChange
}: SidebarWorkspaceOptionsMenuProps) {
  const t = useTranslate()
  useUiLanguageRevision()
  const { hasAnyFilter, activeFilterCount } = useWorkspaceOptionsFilterBadge()
  const keptHintOpen = useAppStore((s) => s.worktreeCardsIntroKeptHintOpen)

  return (
    // Why: mounted beside its menu item, the sheet opens even when the list shows its empty state.
    <>
      <SidebarOptionsPopover
        ariaLabel={
          hasAnyFilter
            ? t(
                'auto.components.sidebar.SidebarWorkspaceOptionsMenu.optionsActiveFilters',
                'Workspace options ({{count}} filters active)',
                {
                  count: activeFilterCount,
                  defaultValue_one: 'Workspace options ({{count}} filter active)'
                }
              )
            : t(
                'auto.components.sidebar.SidebarWorkspaceOptionsMenu.9919ae1082',
                'Workspace options'
              )
        }
        tooltip={
          hasAnyFilter
            ? t(
                'auto.components.sidebar.SidebarWorkspaceOptionsMenu.optionsFilterCount',
                'Workspace options ({{count}} filters)',
                {
                  count: activeFilterCount,
                  defaultValue_one: 'Workspace options ({{count}} filter)'
                }
              )
            : t(
                'auto.components.sidebar.SidebarWorkspaceOptionsMenu.9919ae1082',
                'Workspace options'
              )
        }
        activeFilterCount={activeFilterCount}
        preserveWorkspaceBoardOpen={preserveWorkspaceBoardOpen}
        onMenuOpenChange={onMenuOpenChange}
        hint={{
          open: keptHintOpen,
          onDismiss: dismissKeptHint,
          content: <WorktreeCardsKeptHintContent />
        }}
      >
        <WorkspaceOptionsMenuItems preserveWorkspaceBoardOpen={preserveWorkspaceBoardOpen} />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={openClientGrouping}>
            {t(
              'auto.components.sidebar.SidebarWorkspaceOptionsMenu.groupByClient',
              'Group by client…'
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </SidebarOptionsPopover>
      <ClientGroupingSheet />
    </>
  )
})

export default SidebarWorkspaceOptionsMenu
