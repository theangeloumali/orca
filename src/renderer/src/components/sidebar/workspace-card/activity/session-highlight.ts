import type { WorktreeStatus } from '../../../../../../shared/worktree/row-display/worktree-status-rollup'

export type SessionHighlight = 'working' | 'needs-you'

/** Only live agents light up their row; idle, done and failed stay quiet. */
export function getSessionHighlight(status: WorktreeStatus | null): SessionHighlight | undefined {
  if (status === 'working') {
    return 'working'
  }
  return status === 'permission' ? 'needs-you' : undefined
}
