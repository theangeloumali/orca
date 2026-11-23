import type { BrowserWorkspace } from '../../../../../../shared/browser/workspaces/browser-workspace-types'
import type { Tab } from '../../../../../../shared/workspace-layout/tab-groups/tab-types'
import type {
  TerminalLayoutSnapshot,
  TerminalTab
} from '../../../../../../shared/workspace-layout/terminal-tab-types'
import {
  getStructuredAgentSessionTabs,
  structuredTabPaneKey,
  type StructuredTab
} from '@/components/native-chat/session/status/structured-agent-session-tabs'
import { createWorktreeTabBucketProjection } from '@/lib/workspace/tabs/worktree-tab-bucket-projection'
import type { StructuredChatSleptAtByPaneKey } from '@/store/slices/agent-status/structured-sessions/structured-chat-slept-at'

export type TerminalActivityTab = Pick<TerminalTab, 'id'>
export type BrowserActivityTab = Pick<BrowserWorkspace, 'id'>

export function createVisibleWorktreeTerminalActivityProjection(
  onInspectBucket?: (worktreeId: string) => void
) {
  return createWorktreeTabBucketProjection<TerminalTab, TerminalActivityTab>({
    projectTab: (tab) => ({ id: tab.id }),
    isSameProjectedTab: (previousTab, nextTab) => previousTab.id === nextTab.id,
    onInspectBucket
  })
}

const terminalProjection = createVisibleWorktreeTerminalActivityProjection()

export function getVisibleWorktreeTerminalActivityTabs(
  tabsByWorktree: Record<string, TerminalTab[]>
): Record<string, TerminalActivityTab[]> {
  return terminalProjection.project(tabsByWorktree)
}

const browserProjection = createWorktreeTabBucketProjection<BrowserWorkspace, BrowserActivityTab>({
  projectTab: (tab) => ({ id: tab.id }),
  isSameProjectedTab: (previousTab, nextTab) => previousTab.id === nextTab.id
})

export function getVisibleWorktreeBrowserActivityTabs(
  browserTabsByWorktree: Record<string, BrowserWorkspace[]>
): Record<string, BrowserActivityTab[]> {
  return browserProjection.project(browserTabsByWorktree)
}

export const EMPTY_STRUCTURED_CHAT_WORKTREE_IDS: ReadonlySet<string> = new Set()
const EMPTY_SLEPT_CHATS: StructuredChatSleptAtByPaneKey = {}
const structuredChatWorktreeIds = new WeakMap<
  readonly StructuredTab[],
  WeakMap<StructuredChatSleptAtByPaneKey, ReadonlySet<string>>
>()

/** Only explicit Sleep marks rest a structured chat; idle child teardown or restart must not hide its workspace. */
export function getWorktreeIdsWithStructuredChat(
  unifiedTabsByWorktree: Record<string, Tab[]> | null | undefined,
  structuredChatSleptAtByPaneKey: StructuredChatSleptAtByPaneKey = EMPTY_SLEPT_CHATS
): ReadonlySet<string> {
  if (!unifiedTabsByWorktree) {
    return EMPTY_STRUCTURED_CHAT_WORKTREE_IDS
  }
  // Keyed by the chat list, which keeps its identity across terminal title and focus writes.
  const chats = getStructuredAgentSessionTabs(unifiedTabsByWorktree)
  const cached = structuredChatWorktreeIds.get(chats)?.get(structuredChatSleptAtByPaneKey)
  if (cached) {
    return cached
  }
  const worktreeIds = new Set(
    chats
      .filter((tab) => structuredChatSleptAtByPaneKey[structuredTabPaneKey(tab)] === null)
      .map((tab) => tab.worktreeId)
  )
  const bySleptAt = structuredChatWorktreeIds.get(chats) ?? new WeakMap()
  bySleptAt.set(structuredChatSleptAtByPaneKey, worktreeIds)
  structuredChatWorktreeIds.set(chats, bySleptAt)
  return worktreeIds
}

export function getStructuredChatWorktreeIds(
  showSleepingWorkspaces: boolean,
  unifiedTabsByWorktree: Record<string, Tab[]> | null | undefined,
  structuredChatSleptAtByPaneKey: StructuredChatSleptAtByPaneKey = EMPTY_SLEPT_CHATS
): ReadonlySet<string> {
  return showSleepingWorkspaces
    ? EMPTY_STRUCTURED_CHAT_WORKTREE_IDS
    : getWorktreeIdsWithStructuredChat(unifiedTabsByWorktree, structuredChatSleptAtByPaneKey)
}

export type TerminalLeafPtyIds = Pick<TerminalLayoutSnapshot, 'ptyIdsByLeafId'>
let leafPtySource: Record<string, TerminalLayoutSnapshot> | null = null
let leafPtyIds: Record<string, TerminalLeafPtyIds> = {}

/** Leaf PTY ids per tab; the same object while no tab's PTY map changed, so title writes stay quiet. */
export function getTerminalLeafPtyIds(
  terminalLayoutsByTabId: Record<string, TerminalLayoutSnapshot>
): Record<string, TerminalLeafPtyIds> {
  if (terminalLayoutsByTabId === leafPtySource) {
    return leafPtyIds
  }
  leafPtySource = terminalLayoutsByTabId
  const tabIds = Object.keys(terminalLayoutsByTabId)
  const unchanged =
    tabIds.length === Object.keys(leafPtyIds).length &&
    tabIds.every(
      (tabId) => leafPtyIds[tabId]?.ptyIdsByLeafId === terminalLayoutsByTabId[tabId]?.ptyIdsByLeafId
    )
  if (!unchanged) {
    leafPtyIds = Object.fromEntries(
      tabIds.map((tabId) => [
        tabId,
        { ptyIdsByLeafId: terminalLayoutsByTabId[tabId]?.ptyIdsByLeafId }
      ])
    )
  }
  return leafPtyIds
}
