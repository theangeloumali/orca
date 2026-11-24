import type { Worktree } from '../workspace-list/workspace-list-types'

/** What a project header's activity badges show. */
export type ProjectActivity = { working: number; needsYou: number }

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
    const working = section.data.filter(isWorking).length
    const waiting = section.data.filter(needsYou).length
    if (working > 0 || waiting > 0) {
      activity.set(section.key, { working, needsYou: waiting })
    }
  }
  return activity
}
