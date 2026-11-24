import React from 'react'
import { Ellipsis, FolderPlus, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { getFolderWorkspacePathStatusDescription } from '@/lib/workspace/paths/folder-workspace-path-status'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { FolderWorkspacePathStatus } from '../../../../../../shared/folder-workspaces/folder-workspace-path-status'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { getFolderProjectGroupRefreshHandler } from './project-group-folder-refresh'
import { useProjectGroupAppearanceControls } from './appearance-controls'
import { AppearanceMenuItems } from './AppearanceMenuItems'
import { CustomColorDialog } from '../../CustomColorDialog'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../../../shared/repository/appearance/repo-badge-color'
import { HOST_COLOR_NONE } from '../../../../../../shared/execution-host/host-appearance'
import { ProjectGroupMoveSubmenu } from './ProjectGroupMoveSubmenu'
import { useRuntimeEnvironmentCapability } from '@/runtime/rpc/compatibility/use-runtime-environment-capability'
import { PROJECT_GROUP_PARENT_UPDATE_RUNTIME_CAPABILITY } from '../../../../../../shared/remote-runtime/protocol/worktree-runtime-capabilities'
import { REPO_HEADER_ACTION_BUTTON_CLASS } from './repo-header-action-button-class'
import { SectionCollapseAllButton } from '../controls/SectionCollapseAllButton'
import { getShortcutPlatform } from '@/lib/keyboard/shortcut-platform'
import {
  useProjectGroupSubtreeCollapse,
  useVisibleProjectGroupSubtreeProjectCount
} from './use-project-group-subtree-collapse'
import {
  useProjectGroupAgentActivityCounts,
  useProjectGroupSubtreeIds
} from './use-project-group-agent-activity-counts'
import {
  handleRepoHeaderActionPointerDown,
  stopRepoHeaderKeyboardToggle,
  stopRepoHeaderMenuEvent
} from './header-event-guards'

export function ProjectGroupHeaderMenu({
  groupId,
  hostId,
  label,
  projectGroup,
  onRefreshProjectGroup,
  onRename,
  onDelete,
  projectGroups,
  onCreateSubgroup,
  onMoveGroup,
  collapsedGroups,
  onToggleSubtree
}: {
  groupId: string
  /** The list's displayed fold, so collapse-all follows the filter session. */
  collapsedGroups: ReadonlySet<string>
  onToggleSubtree: (groupId: string) => boolean
  /** Owner host of the group row, so rename/delete route to the host that holds it. */
  hostId?: ExecutionHostId
  label: string
  projectGroup: ProjectGroup | null
  onRefreshProjectGroup?: (projectGroup: ProjectGroup) => void
  onRename: (groupId: string, currentName: string, hostId?: ExecutionHostId) => void
  onDelete: (groupId: string, groupName: string, hostId?: ExecutionHostId) => void
  projectGroups?: readonly ProjectGroup[]
  onCreateSubgroup?: (groupId: string, groupName: string, hostId?: ExecutionHostId) => void
  onMoveGroup?: (groupId: string, parentGroupId: string | null, hostId?: ExecutionHostId) => void
}): React.JSX.Element {
  const t = useTranslate()
  const onRefresh = getFolderProjectGroupRefreshHandler(projectGroup, onRefreshProjectGroup)
  // Moving needs the server's parent-update capability (an older one drops parentGroupId and still
  // reports success); creating a subgroup does not, since every server accepts a parent on create.
  const runtimeEnvironmentId = hostId?.startsWith('runtime:')
    ? hostId.slice('runtime:'.length)
    : null
  const remoteSupportsNesting = useRuntimeEnvironmentCapability(
    runtimeEnvironmentId,
    PROJECT_GROUP_PARENT_UPDATE_RUNTIME_CAPABILITY
  )
  const nestingSupported = runtimeEnvironmentId === null || remoteSupportsNesting
  const appearance = useProjectGroupAppearanceControls(groupId, hostId)
  const [colorOpen, setColorOpen] = React.useState(false)
  return (
    <>
      <ProjectGroupCollapseAllButton
        groupId={groupId}
        label={label}
        collapsedGroups={collapsedGroups}
        onToggleSubtree={onToggleSubtree}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={REPO_HEADER_ACTION_BUTTON_CLASS}
            data-repo-header-action=""
            aria-label={t(
              'auto.components.sidebar.WorktreeList.79465e9034',
              'Group actions for {{value0}}',
              { value0: label }
            )}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={stopRepoHeaderKeyboardToggle}
            onPointerDown={handleRepoHeaderActionPointerDown}
          >
            <Ellipsis className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={6}
          // Why: Radix portals keep React bubbling through the project header; block menu events from arming row drag/collapse.
          onPointerDown={stopRepoHeaderMenuEvent}
          onMouseDown={stopRepoHeaderMenuEvent}
          onPointerUp={stopRepoHeaderMenuEvent}
          onMouseUp={stopRepoHeaderMenuEvent}
          onClick={stopRepoHeaderMenuEvent}
          onKeyDown={stopRepoHeaderMenuEvent}
        >
          {onRefresh ? (
            <DropdownMenuItem onSelect={onRefresh}>
              <RefreshCw className="size-3.5" />
              {t('auto.components.sidebar.WorktreeList.refreshProjectGroup', 'Refresh projects')}
            </DropdownMenuItem>
          ) : null}
          {onCreateSubgroup ? (
            <DropdownMenuItem onSelect={() => onCreateSubgroup(groupId, label, hostId)}>
              <FolderPlus className="size-3.5" />
              {t('auto.components.sidebar.WorktreeList.newSubgroup', 'New subgroup…')}
            </DropdownMenuItem>
          ) : null}
          {onMoveGroup && projectGroups ? (
            <ProjectGroupMoveSubmenu
              groupId={groupId}
              hostId={hostId}
              projectGroups={projectGroups}
              disabled={!nestingSupported}
              onMove={onMoveGroup}
            />
          ) : null}
          <DropdownMenuSeparator />
          <AppearanceMenuItems
            controls={appearance}
            swatchLabel={(color) =>
              t(
                'auto.components.sidebar.WorktreeList.groupColorSwatch',
                'Use {{color}} for this group',
                {
                  color
                }
              )
            }
            onCustomColor={() => setColorOpen(true)}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onRename(groupId, label, hostId)}>
            {t('auto.components.sidebar.WorktreeList.4d7b73658c', 'Rename group')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(groupId, label, hostId)}>
            {t('auto.components.sidebar.WorktreeList.902115cdbe', 'Delete group')}
          </DropdownMenuItem>
        </DropdownMenuContent>
        <CustomColorDialog
          open={colorOpen}
          onOpenChange={setColorOpen}
          currentColor={
            appearance.colorValue === HOST_COLOR_NONE
              ? DEFAULT_REPO_BADGE_COLOR
              : appearance.colorValue
          }
          title={t(
            'auto.components.sidebar.WorktreeList.groupColorDialogTitle',
            'Custom group color'
          )}
          description={t(
            'auto.components.sidebar.WorktreeList.groupColorDialogDescription',
            'Group colors sync with the group; background strength stays on this computer.'
          )}
          pickerLabel={t(
            'auto.components.sidebar.WorktreeList.groupColorPickerLabel',
            'Group color'
          )}
          onSave={appearance.selectColor}
        />
      </DropdownMenu>
    </>
  )
}

/** "7 projects · 1 needs you" on a folded group header; gone once the group is open. */
export function ProjectGroupFoldedSummary({
  groupId,
  collapsed
}: {
  groupId: string
  /** The header's displayed fold, which a filter session may differ from the saved one. */
  collapsed: boolean
}): React.JSX.Element | null {
  // Why split: an open group mounts no counting subscriptions at all.
  return collapsed ? <FoldedGroupCounts groupId={groupId} /> : null
}

function FoldedGroupCounts({ groupId }: { groupId: string }): React.JSX.Element {
  const t = useTranslate()
  const subtreeGroupIds = useProjectGroupSubtreeIds(groupId)
  const projectCount = useVisibleProjectGroupSubtreeProjectCount(subtreeGroupIds)
  const { needsYou } = useProjectGroupAgentActivityCounts(subtreeGroupIds)
  const projectsText = t(
    'auto.components.sidebar.WorktreeList.groupSummaryProjects',
    '{{count}} projects',
    {
      count: projectCount,
      defaultValue_one: '{{count}} project'
    }
  )
  const needsYouText = t(
    'auto.components.sidebar.WorktreeList.groupSummaryNeedsYou',
    '{{count}} need you',
    {
      count: needsYou,
      defaultValue_one: '{{count}} needs you'
    }
  )
  const summaryClassName =
    'min-w-0 truncate text-[11px] font-normal leading-4 text-muted-foreground tabular-nums'
  if (needsYou === 0) {
    return <span className={summaryClassName}>{projectsText}</span>
  }
  // The visual "·" separator is hidden; screen readers get one comma-joined phrase.
  return (
    <span className={summaryClassName}>
      <span className="sr-only">
        {t('auto.components.sidebar.WorktreeList.groupSummaryLabel', '{{projects}}, {{needsYou}}', {
          projects: projectsText,
          needsYou: needsYouText
        })}
      </span>
      <span aria-hidden>
        {projectsText}
        {' · '}
        <span className="text-agent-question">{needsYouText}</span>
      </span>
    </span>
  )
}

// Marks the toggle as a header action so its click never also folds the group row.
const COLLAPSE_ALL_TOGGLE_ATTRIBUTES: Record<`data-${string}`, string> = {
  'data-repo-header-action': ''
}

function ProjectGroupCollapseAllButton({
  groupId,
  label,
  collapsedGroups,
  onToggleSubtree
}: {
  groupId: string
  label: string
  collapsedGroups: ReadonlySet<string>
  onToggleSubtree: (groupId: string) => boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const { hasSubtree, allCollapsed } = useProjectGroupSubtreeCollapse(groupId, collapsedGroups)
  if (!hasSubtree) {
    return null
  }
  const altKey = getShortcutPlatform() === 'darwin' ? '⌥' : 'Alt'
  return (
    <span className="contents" onPointerDown={handleRepoHeaderActionPointerDown}>
      <SectionCollapseAllButton
        allCollapsed={allCollapsed}
        onToggle={() => onToggleSubtree(groupId)}
        collapseLabel={t(
          'auto.components.sidebar.WorktreeList.collapseAllInGroup',
          'Collapse all in {{value0}}',
          { value0: label }
        )}
        expandLabel={t(
          'auto.components.sidebar.WorktreeList.expandAllInGroup',
          'Expand all in {{value0}}',
          { value0: label }
        )}
        shortcut={{
          keys: [altKey, t('auto.components.sidebar.WorktreeList.clickKeyLabel', 'Click')],
          doubleTap: false
        }}
        toggleAttributes={COLLAPSE_ALL_TOGGLE_ATTRIBUTES}
      />
    </span>
  )
}

export function ProjectGroupCreateWorkspaceButton({
  projectGroup,
  label,
  pathStatus,
  disabled,
  onCreate
}: {
  projectGroup: ProjectGroup
  label: string
  pathStatus: FolderWorkspacePathStatus | null
  disabled: boolean
  onCreate: (projectGroup: ProjectGroup) => void
}): React.JSX.Element {
  const t = useTranslate()
  const createLabel = t(
    'auto.components.sidebar.WorktreeList.bd37a57ac8',
    'Create workspace for {{value0}}',
    { value0: label }
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-repo-header-action=""
          className={cn(
            REPO_HEADER_ACTION_BUTTON_CLASS,
            disabled &&
              'cursor-not-allowed text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground/60'
          )}
          aria-label={createLabel}
          aria-disabled={disabled}
          onKeyDown={stopRepoHeaderKeyboardToggle}
          onPointerDown={handleRepoHeaderActionPointerDown}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (disabled) {
              return
            }
            onCreate(projectGroup)
          }}
        >
          <Plus className="size-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {pathStatus?.exists === false
          ? getFolderWorkspacePathStatusDescription(pathStatus, t)
          : createLabel}
      </TooltipContent>
    </Tooltip>
  )
}
