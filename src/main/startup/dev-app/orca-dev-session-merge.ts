/**
 * Prod's import merged into Orca Dev's session. Prod owns the tabs it imported (last sync's ledger plus
 * its current tabs); Dev keeps its own tabs, focus, host fences and fork records.
 */
import {
  isSeededSessionField,
  isSessionField
} from '../../persistence/moving-wsl-projects/terminal-state/wsl-move-session-rewrite'
import { editorTabShowsFile } from '../../../shared/workspace-layout/editor-tabs/workspace-layout-editor-tab-file'
import { collectTabGroupLayoutGroupIds } from '../../../shared/workspace-layout/tab-groups/tab-group-moves'
import { WORKSPACE_SESSION_FIELD_OWNERSHIP } from '../../../shared/workspace-session/workspace-session-host-field-ownership'
import {
  isWorkspaceSessionRecord,
  type WorkspaceSessionRecord
} from '../../../shared/workspace-session/workspace-session-host-records'
import {
  ownedEditorFileId,
  paneBelongsToTabs
} from '../../../shared/workspace-session/workspace-session-pane-ownership'
import { safeParseWorkspaceSession } from '../../../shared/workspace-session/workspace-session-schema'
import type { WorkspaceSessionState } from '../../../shared/workspace-session/workspace-session-state-types'
import { filterWorkspaceSessionTabs } from '../../../shared/workspace-session/workspace-session-tab-filter'

/** Terminal and tab-bar ids of an import: the ledger the next sync replaces. */
export function importedTabIds(session: WorkspaceSessionState): string[] {
  const terminals = Object.values(session.tabsByWorktree).flat()
  const unified = Object.values(session.unifiedTabs ?? {}).flat()
  return [...new Set([...terminals, ...unified].map((tab) => tab.id))]
}

/** The session to write; null leaves Dev's as it is, for one neither side can merge safely. */
export function mergedOrcaDevSession(
  devRaw: unknown,
  prod: WorkspaceSessionState,
  priorImportedTabIds: Iterable<string>
): WorkspaceSessionState | null {
  if (devRaw === undefined) {
    return prod
  }
  const dev = safeParseWorkspaceSession(devRaw)
  if (!dev?.success) {
    return null
  }
  const devOwned = devOwnedTabIds(dev.data)
  const imported = new Set(
    [...priorImportedTabIds, ...importedTabIds(prod)].filter((tabId) => !devOwned.has(tabId))
  )
  const merged: WorkspaceSessionRecord = { ...withoutImportedTabs(dev.data, imported) }
  const prodRows: WorkspaceSessionRecord = { ...prod }
  for (const field of Object.keys(WORKSPACE_SESSION_FIELD_OWNERSHIP)) {
    if (isSessionField(field) && isSeededSessionField(field)) {
      merged[field] = mergeField(merged[field], prodRows[field], field === 'tabGroups')
    }
  }
  const result = safeParseWorkspaceSession(merged)
  return result?.success ? withDevSelection(foldGroupsOutsideLayout(result.data), dev.data) : null
}

/** An imported tab holding a Dev fork or an unsaved Dev draft is Dev's now: later syncs keep it. */
function devOwnedTabIds(dev: WorkspaceSessionState): Set<string> {
  const records = Object.values(dev.sleepingAgentSessionsByPaneKey ?? {})
  const forks = records.flatMap((record) =>
    record.tabId && !isImportedRecord(record) ? [record.tabId] : []
  )
  const drafts = Object.entries(dev.unifiedTabs ?? {}).flatMap(([owner, tabs]) => {
    const files = (dev.openFilesByWorktree?.[owner] ?? []).filter(
      (file) => file.dirtyDraftContent !== undefined
    )
    return tabs
      .filter((tab) =>
        files.some((file) => editorTabShowsFile(tab.entityId, file, file.worktreeId))
      )
      .map((tab) => tab.id)
  })
  return new Set([...forks, ...drafts])
}

/** Dev minus every row of an imported tab; Dev's own (unflagged) fork records stay. */
function withoutImportedTabs(
  dev: WorkspaceSessionState,
  imported: ReadonlySet<string>
): WorkspaceSessionState {
  const isImported = (key: string): boolean => imported.has(key) || paneBelongsToTabs(key, imported)
  // Terminal rows are the caller's job in filterWorkspaceSessionTabs.
  const kept: WorkspaceSessionRecord = {
    ...filterWorkspaceSessionTabs(dev, (_owner, tab) => !imported.has(tab.id)),
    tabsByWorktree: Object.fromEntries(
      Object.entries(dev.tabsByWorktree).map(([owner, tabs]) => [
        owner,
        tabs.filter((tab) => !imported.has(tab.id))
      ])
    )
  }
  for (const [field, ownership] of Object.entries(WORKSPACE_SESSION_FIELD_OWNERSHIP)) {
    const value = kept[field]
    if (!isWorkspaceSessionRecord(value)) {
      continue
    }
    if (ownership === 'sleepingAgentKeyed') {
      kept[field] = filterEntries(value, (_key, record) => !isImportedRecord(record))
    } else if (
      ownership === 'tabKeyed' ||
      ownership === 'paneKeyed' ||
      ownership === 'surfaceTombstoneKeyed'
    ) {
      kept[field] = filterEntries(value, (key) => !isImported(key))
    }
  }
  const parsed = safeParseWorkspaceSession(kept)
  return parsed?.success ? parsed.data : dev
}

function isImportedRecord(record: unknown): boolean {
  return isWorkspaceSessionRecord(record) && record.importedFromProd === true
}

function filterEntries(
  record: WorkspaceSessionRecord,
  keep: (key: string, value: unknown) => boolean
): WorkspaceSessionRecord {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => keep(key, value)))
}

/** Dev's entry wins a key; a per-workspace list is unioned by row id, Dev's rows first. */
function mergeField(devValue: unknown, prodValue: unknown, unionGroups: boolean): unknown {
  if (!isWorkspaceSessionRecord(prodValue)) {
    return devValue
  }
  if (!isWorkspaceSessionRecord(devValue)) {
    return prodValue
  }
  const out: WorkspaceSessionRecord = { ...prodValue, ...devValue }
  for (const [key, prodEntry] of Object.entries(prodValue)) {
    const devEntry = devValue[key]
    if (Array.isArray(devEntry) && Array.isArray(prodEntry)) {
      out[key] = unionRows(devEntry, prodEntry, unionGroups)
    }
  }
  return out
}

function rowId(row: unknown): unknown {
  if (!isWorkspaceSessionRecord(row)) {
    return row
  }
  // Browser pages key by page id; editor rows by the store's owned id, so equal paths on two hosts stay apart.
  return row.id ?? row.browserPageId ?? editorRowId(row) ?? row
}

function editorRowId(row: WorkspaceSessionRecord): string | undefined {
  const { filePath, worktreeId, runtimeEnvironmentId, externalSshTargetId } = row
  if (typeof filePath !== 'string' || typeof worktreeId !== 'string') {
    return undefined
  }
  const runtime = typeof runtimeEnvironmentId === 'string' ? runtimeEnvironmentId : null
  const sshTarget = typeof externalSshTargetId === 'string' ? externalSshTargetId : ''
  return `${ownedEditorFileId(filePath, worktreeId, runtime)}|${sshTarget}`
}

function unionRows(devRows: unknown[], prodRows: unknown[], unionGroups: boolean): unknown[] {
  const byId = new Map(devRows.map((row) => [rowId(row), row]))
  for (const row of prodRows) {
    const existing = byId.get(rowId(row))
    if (existing === undefined) {
      byId.set(rowId(row), row)
    } else if (unionGroups && isWorkspaceSessionRecord(existing) && isWorkspaceSessionRecord(row)) {
      byId.set(rowId(row), { ...existing, tabOrder: unionIds(existing.tabOrder, row.tabOrder) })
    }
  }
  return [...byId.values()]
}

function unionIds(first: unknown, second: unknown): string[] {
  const ids = [first, second].flatMap((list) => (Array.isArray(list) ? list : []))
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))]
}

/** A prod group Dev's layout never placed would be invisible: its tabs join Dev's active group. */
function foldGroupsOutsideLayout(session: WorkspaceSessionState): WorkspaceSessionState {
  const tabGroups = { ...session.tabGroups }
  const unifiedTabs = { ...session.unifiedTabs }
  let folded = false
  for (const [owner, groups] of Object.entries(tabGroups)) {
    const placed = collectTabGroupLayoutGroupIds(session.tabGroupLayouts?.[owner])
    const preferred = session.activeGroupIdByWorktree?.[owner]
    const target = preferred && placed.has(preferred) ? preferred : placed.values().next().value
    const strays = new Set(groups.filter((group) => !placed.has(group.id)).map((group) => group.id))
    if (!target || strays.size === 0) {
      continue
    }
    const moved = groups.filter((group) => strays.has(group.id)).flatMap((group) => group.tabOrder)
    tabGroups[owner] = groups.flatMap((group) => {
      if (strays.has(group.id)) {
        return []
      }
      return group.id === target
        ? [{ ...group, tabOrder: unionIds(group.tabOrder, moved) }]
        : [group]
    })
    unifiedTabs[owner] = (unifiedTabs[owner] ?? []).map((tab) =>
      strays.has(tab.groupId) ? { ...tab, groupId: target } : tab
    )
    folded = true
  }
  return folded ? { ...session, tabGroups, unifiedTabs } : session
}

/** Dev's selected tab, per group and per workspace, wherever it survived the merge. */
function withDevSelection(
  session: WorkspaceSessionState,
  dev: WorkspaceSessionState
): WorkspaceSessionState {
  const devActive = new Map(
    Object.values(dev.tabGroups ?? {})
      .flat()
      .map((group) => [group.id, group.activeTabId])
  )
  const tabGroups = Object.fromEntries(
    Object.entries(session.tabGroups ?? {}).map(([owner, groups]) => [
      owner,
      groups.map((group) => {
        const selected = devActive.get(group.id)
        return selected && group.tabOrder.includes(selected)
          ? { ...group, activeTabId: selected }
          : group
      })
    ])
  )
  const activeTabIdByWorktree = { ...session.activeTabIdByWorktree }
  const activeTabTypeByWorktree = { ...session.activeTabTypeByWorktree }
  for (const [owner, tabId] of Object.entries(dev.activeTabIdByWorktree ?? {})) {
    if (tabId && session.unifiedTabs?.[owner]?.some((tab) => tab.id === tabId)) {
      activeTabIdByWorktree[owner] = tabId
      const devType = dev.activeTabTypeByWorktree?.[owner]
      if (devType) {
        activeTabTypeByWorktree[owner] = devType
      }
    }
  }
  return { ...session, tabGroups, activeTabIdByWorktree, activeTabTypeByWorktree }
}
