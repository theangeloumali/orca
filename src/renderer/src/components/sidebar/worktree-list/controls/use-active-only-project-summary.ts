import { useCallback, useState, useSyncExternalStore } from 'react'
import { shallow } from 'zustand/shallow'
import type { AppState } from '@/store/types'
import type { RuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { useAppStoreWithHostStatuses } from '@/store/slices/runtime-status/views/use-runtime-status-view'
import { useNow } from '@/lib/window-activity/use-now'
import { useBotListedWorktreeIdentities } from '@/components/bots/use-bot-listed-worktree-identities'
import {
  readHiddenVmCheckouts,
  subscribeHiddenVmCheckouts
} from '@/runtime/ephemeral-vm/vm-create-hidden-checkouts'
import { useAgentSendTargetWorktreeId } from '../listing/use-agent-send-target'
import { createActiveOnlySummarySelector } from './active-only-summary-selector'
import type { ActiveOnlySummary } from './active-only-project-summary'

/** Counts for the Active only status line; same 30s clock as the agent badges so they expire together. */
export function useActiveOnlySummary(): ActiveOnlySummary {
  const now = useNow(30_000)
  const botListed = useBotListedWorktreeIdentities()
  const hiddenVmCheckouts = useSyncExternalStore(subscribeHiddenVmCheckouts, readHiddenVmCheckouts)
  const agentSendTarget = useAgentSendTargetWorktreeId()
  const [select] = useState(createActiveOnlySummarySelector)
  const selector = useCallback(
    (state: AppState, statuses: RuntimeStatuses) =>
      select(state, { now, statuses, hiddenVmCheckouts, botListed, agentSendTarget }),
    [select, now, hiddenVmCheckouts, botListed, agentSendTarget]
  )
  return useAppStoreWithHostStatuses(selector, shallow)
}
