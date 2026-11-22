import { getWorkspaceLastActiveAt } from '../../workspace-cleanup/workspace-last-active'

/** Projects untouched this long are offered for Archive; never archived automatically. */
export const IDLE_PROJECT_THRESHOLD_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type ProjectWorkspaceActivity = {
  lastActivityAt: number
  lastVisitedAt: number | undefined
}

/** The newest workspace activity; a project with no workspaces counts from when it was added. */
export function getProjectLastActiveAt(
  addedAt: number,
  workspaces: readonly ProjectWorkspaceActivity[]
): number {
  if (workspaces.length === 0) {
    return addedAt
  }
  return Math.max(
    ...workspaces.map((workspace) =>
      getWorkspaceLastActiveAt(workspace.lastActivityAt, workspace.lastVisitedAt)
    )
  )
}

export function getIdleDays(lastActiveAt: number, now: number): number {
  return Math.max(0, Math.floor((now - lastActiveAt) / DAY_MS))
}

export function isIdleProject(lastActiveAt: number, now: number): boolean {
  return now - lastActiveAt >= IDLE_PROJECT_THRESHOLD_DAYS * DAY_MS
}
