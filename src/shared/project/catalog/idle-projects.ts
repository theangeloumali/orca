/** Projects untouched this long are offered for Archive; never archived automatically. */
export const IDLE_PROJECT_THRESHOLD_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type ProjectWorkspaceActivity = {
  lastActivityAt: number
  lastVisitedAt: number | undefined
}

/** Newest of addedAt, activity and visits: an unused workspace (activity 0) must not age a new project. */
export function getProjectLastActiveAt(
  addedAt: number,
  workspaces: readonly ProjectWorkspaceActivity[]
): number {
  let newest = addedAt
  for (const workspace of workspaces) {
    newest = Math.max(newest, workspace.lastActivityAt, workspace.lastVisitedAt ?? 0)
  }
  return newest
}

export function getIdleDays(lastActiveAt: number, now: number): number {
  return Math.max(0, Math.floor((now - lastActiveAt) / DAY_MS))
}

export function isIdleProject(lastActiveAt: number, now: number): boolean {
  return now - lastActiveAt >= IDLE_PROJECT_THRESHOLD_DAYS * DAY_MS
}
