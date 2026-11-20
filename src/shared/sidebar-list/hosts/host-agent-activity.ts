import type { LiveAgentWorktreeStatus } from '../feed-facts/workspace-activity-facts'

export type HostAgentActivityCounts = { working: number; needsYou: number }

/** A machine header's live agents; monitoring is still work in progress, a permission prompt waits on you. */
export function countHostAgentActivity(
  worktreeIds: readonly string[],
  liveByWorktreeId: ReadonlyMap<string, LiveAgentWorktreeStatus>
): HostAgentActivityCounts {
  let working = 0
  let needsYou = 0
  for (const worktreeId of worktreeIds) {
    const status = liveByWorktreeId.get(worktreeId)
    if (status === 'permission') {
      needsYou += 1
    } else if (status === 'working' || status === 'monitoring') {
      working += 1
    }
  }
  return { working, needsYou }
}
