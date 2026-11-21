import type { ProjectGroupingModel } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'

const UNMERGED_PROJECT_GROUPING: ProjectGroupingModel = { projects: [], projectHostSetups: [] }

/**
 * Projects cloned on several machines merge into one header in the Projects layout. Machine
 * sections list each machine's copy under that machine's own group instead (#29535).
 */
export function getSidebarProjectGrouping(
  projection: {
    projects: ProjectGroupingModel['projects']
    setups: ProjectGroupingModel['projectHostSetups']
  },
  showMachineSections: boolean
): ProjectGroupingModel {
  return showMachineSections
    ? UNMERGED_PROJECT_GROUPING
    : { projects: projection.projects, projectHostSetups: projection.setups }
}
