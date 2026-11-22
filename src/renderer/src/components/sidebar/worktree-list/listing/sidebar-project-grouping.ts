import { isLocalExecutionHost } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroupingModel } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { AppState } from '@/store/types'

type ProjectSetups = ProjectGroupingModel['projectHostSetups']

// One model per setups list, so the grouping index cache keyed by model keeps hitting.
const machineSectionGroupingBySetups = new WeakMap<ProjectSetups, ProjectGroupingModel>()

/**
 * Projects cloned on several machines merge into one header in the Projects layout. Machine
 * sections keep this computer's copy on that project key (mobile shares it for collapse state)
 * and give other machines' copies their own rows, under their own groups (#29535).
 */
export function getSidebarProjectGrouping(
  projection: {
    projects: ProjectGroupingModel['projects']
    setups: ProjectSetups
  },
  showMachineSections: boolean
): ProjectGroupingModel {
  if (!showMachineSections) {
    return { projects: projection.projects, projectHostSetups: projection.setups }
  }
  const cached = machineSectionGroupingBySetups.get(projection.setups)
  if (cached && cached.projects === projection.projects) {
    return cached
  }
  const grouping = {
    projects: projection.projects,
    projectHostSetups: projection.setups.filter((setup) => isLocalExecutionHost(setup.hostId))
  }
  machineSectionGroupingBySetups.set(projection.setups, grouping)
  return grouping
}

/** The grouping the sidebar renders, read from store state. */
export function getSidebarProjectGroupingFromState(
  state: Pick<AppState, 'repos' | 'projects' | 'projectHostSetups' | 'showWorkspaceHostSections'>
): ProjectGroupingModel {
  return getSidebarProjectGrouping(
    getProjectHostSetupProjectionFromState(state),
    state.showWorkspaceHostSections
  )
}
