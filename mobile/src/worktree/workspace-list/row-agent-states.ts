import type { Worktree } from './workspace-list-types'
import { getWorktreeDotStatus, hasWorktreeAgentState } from './workspace-list-ordering'

/** A row whose agent waits on you, the same rule the row's own highlight uses. */
export function rowNeedsYou(row: Worktree): boolean {
  return hasWorktreeAgentState(row) && getWorktreeDotStatus(row) === 'permission'
}

/** A row whose agent is working right now. */
export function rowIsWorking(row: Worktree): boolean {
  return hasWorktreeAgentState(row) && getWorktreeDotStatus(row) === 'working'
}
