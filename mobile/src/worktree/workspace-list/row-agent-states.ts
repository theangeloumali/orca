import type { Worktree } from './workspace-list-types'
import { getWorktreeDotStatus, hasWorktreeAgentState } from './workspace-list-ordering'
import {
  getSessionHighlight,
  type SessionHighlight
} from '../../../../src/shared/worktree/row-display/session-highlight'

// The row's own highlight rule, so filters, folds and badges always agree with the lit rows.
function rowHighlight(row: Worktree): SessionHighlight | undefined {
  return hasWorktreeAgentState(row) ? getSessionHighlight(getWorktreeDotStatus(row)) : undefined
}

/** A row whose agent waits on you. */
export function rowNeedsYou(row: Worktree): boolean {
  return rowHighlight(row) === 'needs-you'
}

/** A row whose agent is working right now. */
export function rowIsWorking(row: Worktree): boolean {
  return rowHighlight(row) === 'working'
}
