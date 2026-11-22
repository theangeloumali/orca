import { useMemo } from 'react'
import { useAppStore } from '@/store/index'
import { getAgentStatusEpochNow } from '@/lib/agent-status/evidence/agent-status-epoch-clock'
import {
  createWorktreeNeedsYouReader,
  type WorkspaceNeedsYouReader
} from './desktop-workspace-row-facts'

/** The Needs you reader the sidebar and the board share; re-read on each agent-status epoch while on. */
export function useWorktreeNeedsYouReader(
  showOnlyNeedsYou: boolean | undefined
): WorkspaceNeedsYouReader | undefined {
  const projection = useAppStore((s) =>
    showOnlyNeedsYou ? s.agentStatusByPaneKey.projection : null
  )
  const epoch = useAppStore((s) => (showOnlyNeedsYou ? s.agentStatusEpoch : 0))
  return useMemo(
    () =>
      projection
        ? createWorktreeNeedsYouReader(projection, getAgentStatusEpochNow(epoch))
        : undefined,
    [projection, epoch]
  )
}
