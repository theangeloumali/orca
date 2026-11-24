import { useCallback, useMemo, type ReactElement } from 'react'
import { isSubtreeFolded } from '../../worktree/project-sections/project-group-fold'
import { resolveWorktreeHostId } from '../../worktree/row-presentation/worktree-host-context-labels'
import type { Section, Worktree } from '../../worktree/workspace-list/workspace-list-types'
import type { HostScreenController } from '../use-host-screen-controller'
import { HostMachineSectionHeader } from './host-machine-section-header'
import { HostQuickFilterChips } from './host-quick-filter-chips'
import { HostOrganizeHints } from '../organize/HostOrganizeHints'
import { useHostOrganizeHints } from '../organize/use-host-organize-hints'

// The fork's list parts (machine headers, group subtree folding, quick filters), kept beside upstream's list.
export function useHostListForkParts(args: {
  sections: readonly Section[]
  displayWorktrees: readonly Worktree[]
  collapsedGroups: ReadonlySet<string>
  pendingCollapseKeys: ReadonlySet<string>
  settings: HostScreenController['settings']
  state: HostScreenController['state']
  client: HostScreenController['client']
  connState: HostScreenController['connState']
  onCatalogChanged: () => void
}) {
  const { sections, displayWorktrees, collapsedGroups, pendingCollapseKeys, settings, state } = args
  const organize = useHostOrganizeHints({
    client: args.client,
    connState: args.connState,
    // The served catalog carries each repo's group and archive state; older desktops fall back to repo.list.
    repos: state.servedProjectSections?.repos ?? state.desktopRepos,
    projectGroups: state.servedProjectSections?.projectGroups ?? state.hostProjectGroups,
    rows: displayWorktrees,
    onChanged: args.onCatalogChanged
  })
  const machineCount = useMemo(
    () =>
      new Set(displayWorktrees.map((row) => resolveWorktreeHostId(row, state.repoHostIdByRepoId)))
        .size,
    [displayWorktrees, state.repoHostIdByRepoId]
  )
  const quickFilters = (
    <>
      <HostQuickFilterChips
        filters={state.view.filters}
        setFilter={settings.setFilter}
        machineCount={machineCount}
      />
      <HostOrganizeHints hints={organize} />
    </>
  )
  const toggleSubtree = useCallback(
    (keys: readonly string[]) =>
      settings.setGroupsCollapsed([...keys], !isSubtreeFolded(keys, collapsedGroups)),
    [settings, collapsedGroups]
  )
  const machineKeys = useMemo(() => sections.flatMap((s) => (s.machine ? [s.key] : [])), [sections])
  const allMachinesCollapsed = machineKeys.every((key) => collapsedGroups.has(key))
  const renderMachineHeader = useCallback(
    (section: Section): ReactElement | null => {
      if (!section.machine) {
        return null
      }
      const collapseKey = section.collapseKey ?? section.key
      return (
        <HostMachineSectionHeader
          machine={section.machine}
          pending={pendingCollapseKeys.has(collapseKey)}
          onToggle={settings.toggleCollapsed}
          collapseAll={
            machineKeys[0] === section.key
              ? {
                  allCollapsed: allMachinesCollapsed,
                  onPress: () => settings.setGroupsCollapsed(machineKeys, !allMachinesCollapsed)
                }
              : null
          }
        />
      )
    },
    [pendingCollapseKeys, settings, machineKeys, allMachinesCollapsed]
  )
  return { quickFilters, toggleSubtree, renderMachineHeader }
}
