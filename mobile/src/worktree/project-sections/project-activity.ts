import type { HostAgentActivityCounts } from '../../../../src/shared/sidebar-list/hosts/host-agent-activity'
import type { Worktree } from '../workspace-list/workspace-list-types'

/** What a project header's activity badges show, counted as a machine header's are. */
export type ProjectActivity = HostAgentActivityCounts

/** The section with its project's activity attached, when it has any. */
export function withProjectActivity<S extends { key: string }>(
  section: S,
  activity: ReadonlyMap<string, ProjectActivity>
): S & { projectActivity?: ProjectActivity } {
  const projectActivity = activity.get(section.key)
  return projectActivity ? { ...section, projectActivity } : section
}

/** Each project section's live agents; quiet projects and group headers get none. */
export function buildProjectActivity(
  sections: readonly { key: string; isProjectGroup?: boolean; data: readonly Worktree[] }[],
  isWorking: (row: Worktree) => boolean,
  needsYou: (row: Worktree) => boolean
): Map<string, ProjectActivity> {
  const activity = new Map<string, ProjectActivity>()
  for (const section of sections) {
    if (section.isProjectGroup) {
      continue
    }
    const counts: ProjectActivity = { working: 0, needsYou: 0 }
    for (const row of section.data) {
      if (isWorking(row)) {
        counts.working += 1
      } else if (needsYou(row)) {
        counts.needsYou += 1
      }
    }
    if (counts.working > 0 || counts.needsYou > 0) {
      activity.set(section.key, counts)
    }
  }
  return activity
}
