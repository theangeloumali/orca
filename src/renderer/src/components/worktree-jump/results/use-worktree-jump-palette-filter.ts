import { useMemo } from 'react'
import { buildSidebarHostOptions } from '@/components/sidebar/worktree-list/controls/sidebar-host-options'
import { buildPaletteFilterModel } from '@/components/cmd-j/palette-filter-options'
import { countPaletteMachines } from '@/components/cmd-j/palette-machine-count'
import {
  buildPaletteFilterPredicate,
  isPaletteFilterActive
} from '@/components/cmd-j/palette-filter'
import { getRepoHostIdentity } from '../../../../../shared/repository/repo-host-identity'
import { getPaletteWorktreeExecutionHostId } from '@/lib/workspace/search/palette-repo-resolution'
import { getHostDisplayLabelOverrides } from '../../../../../shared/execution-host/host-setting-overrides'
import {
  getRepoExecutionHostId,
  getSettingsFocusedExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import type { WorktreeJumpPaletteLocalState } from '../state/use-worktree-jump-palette-local-state'
import type { WorktreeJumpPaletteStoreState } from '../state/use-worktree-jump-palette-store-state'

type WorktreeJumpPaletteFilterInput = Pick<
  WorktreeJumpPaletteStoreState,
  | 'repos'
  | 'settings'
  | 'sshTargetLabels'
  | 'sshConnectionStates'
  | 'runtimeEnvironments'
  | 'runtimeStatusByEnvironmentId'
  | 'workspaces'
  | 'projects'
  | 'projectHostSetups'
  | 'showMachineSections'
> &
  Pick<WorktreeJumpPaletteLocalState, 'filter'>

export function useWorktreeJumpPaletteFilter({
  repos,
  settings,
  sshTargetLabels,
  sshConnectionStates,
  runtimeEnvironments,
  runtimeStatusByEnvironmentId,
  workspaces,
  projects,
  projectHostSetups,
  showMachineSections,
  filter
}: WorktreeJumpPaletteFilterInput) {
  const repoMap = useMemo(() => new Map(repos.map((repo) => [repo.id, repo])), [repos])
  const repoByHostIdentity = useMemo(
    () => new Map(repos.map((repo) => [getRepoHostIdentity(repo), repo])),
    [repos]
  )
  const hostLabelOverrides = useMemo(() => getHostDisplayLabelOverrides(settings), [settings])
  const hostOptions = useMemo(
    () =>
      buildSidebarHostOptions({
        repos: [
          ...repos,
          ...workspaces.map((workspace) => ({
            executionHostId: getPaletteWorktreeExecutionHostId(workspace)
          }))
        ],
        sshTargetLabels,
        sshConnectionStates,
        settings,
        runtimeEnvironments,
        runtimeStatusByEnvironmentId,
        hostLabelOverrides
      }),
    [
      repos,
      workspaces,
      sshTargetLabels,
      sshConnectionStates,
      settings,
      runtimeEnvironments,
      runtimeStatusByEnvironmentId,
      hostLabelOverrides
    ]
  )
  const canCreateWorktree = repos.length > 0
  const defaultHostId = useMemo(() => getSettingsFocusedExecutionHostId(settings), [settings])
  const filterModel = useMemo(
    () =>
      buildPaletteFilterModel({
        repos,
        worktrees: workspaces,
        hostOptions,
        projects,
        projectHostSetups,
        showMachineSections,
        defaultHostId
      }),
    [
      workspaces,
      defaultHostId,
      hostOptions,
      projectHostSetups,
      projects,
      repos,
      showMachineSections
    ]
  )
  const filterActive = isPaletteFilterActive(filter)
  const hostFilterActive = filter.hostIds.length > 0
  const filterPredicate = useMemo(
    () => buildPaletteFilterPredicate(filter, filterModel),
    [filter, filterModel]
  )
  const hostBadgeContext = useMemo(() => {
    const projectHostIds = [
      ...repos.map(getRepoExecutionHostId),
      ...workspaces.flatMap((workspace) => getPaletteWorktreeExecutionHostId(workspace) ?? [])
    ]
    const machineCount = countPaletteMachines(hostOptions, projectHostIds)
    return { hostOptions, hostFilterActive, machineCount }
  }, [hostFilterActive, hostOptions, repos, workspaces])

  return {
    repoMap,
    repoByHostIdentity,
    hostOptions,
    canCreateWorktree,
    defaultHostId,
    filterModel,
    filterActive,
    hostBadgeContext,
    filterPredicate
  }
}

export type WorktreeJumpPaletteFilter = ReturnType<typeof useWorktreeJumpPaletteFilter>
