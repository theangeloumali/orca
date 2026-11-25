import { describe, expect, it } from 'vitest'
import { safeParseWorkspaceSession } from '../../../shared/workspace-session/workspace-session-schema'
import type { WorkspaceSessionState } from '../../../shared/workspace-session/workspace-session-state-types'
import { importedTabIds, mergedOrcaDevSession } from './orca-dev-session-merge'

const WORKTREE = 'wt-1::/repo'

function parsed(raw: unknown): WorkspaceSessionState {
  const result = safeParseWorkspaceSession(raw)
  if (!result?.success) {
    throw new Error('fixture session is invalid')
  }
  return result.data
}

function terminalTab(id: string) {
  return {
    id,
    ptyId: null,
    worktreeId: WORKTREE,
    title: id,
    customTitle: null,
    color: null,
    sortOrder: 0,
    createdAt: 1
  }
}

function unifiedTab(id: string, groupId: string) {
  const tab = { id, entityId: id, groupId, worktreeId: WORKTREE, contentType: 'terminal' }
  return { ...tab, label: id, customLabel: null, color: null, sortOrder: 0, createdAt: 1 }
}

function layout(leafId: string) {
  return { root: { type: 'leaf', leafId }, activeLeafId: leafId, expandedLeafId: null }
}

function agentRecord(tabId: string, sessionId: string, importedFromProd?: true) {
  const paneKey = `${tabId}:leaf-1`
  return {
    paneKey,
    tabId,
    worktreeId: WORKTREE,
    agent: 'claude',
    providerSession: { key: 'session_id', id: sessionId },
    prompt: 'ship it',
    state: 'done',
    capturedAt: 1,
    updatedAt: 1,
    ...(importedFromProd ? { importedFromProd } : {})
  }
}

function openFile(runtimeEnvironmentId: string | null) {
  const file = { filePath: '/repo/src/a.ts', relativePath: 'src/a.ts', worktreeId: WORKTREE }
  return { ...file, language: 'typescript', runtimeEnvironmentId }
}

/** One group holding the given terminal tabs, each with a one-leaf layout. */
function sessionOf(tabIds: string[], groupId = 'group-1', extra: Record<string, unknown> = {}) {
  return {
    activeRepoId: 'repo',
    activeWorktreeId: WORKTREE,
    activeTabId: tabIds[0] ?? null,
    tabsByWorktree: { [WORKTREE]: tabIds.map(terminalTab) },
    terminalLayoutsByTabId: Object.fromEntries(tabIds.map((id) => [id, layout('leaf-1')])),
    unifiedTabs: { [WORKTREE]: tabIds.map((id) => unifiedTab(id, groupId)) },
    tabGroups: {
      [WORKTREE]: [
        { id: groupId, worktreeId: WORKTREE, activeTabId: tabIds[0] ?? null, tabOrder: tabIds }
      ]
    },
    activeGroupIdByWorktree: { [WORKTREE]: groupId },
    ...extra
  }
}

function tabIdsOf(session: WorkspaceSessionState | null) {
  return {
    terminals: session?.tabsByWorktree[WORKTREE]?.map((tab) => tab.id),
    unified: session?.unifiedTabs?.[WORKTREE]?.map((tab) => tab.id),
    groups: session?.tabGroups?.[WORKTREE]?.map((group) => [group.id, group.tabOrder])
  }
}

describe('mergedOrcaDevSession', () => {
  it("keeps a tab created in Dev beside prod's current tabs", () => {
    const dev = sessionOf(['tab-1', 'dev-tab'])
    const prod = parsed(sessionOf(['tab-1', 'tab-2']))

    const merged = mergedOrcaDevSession(dev, prod, ['tab-1'])

    expect(tabIdsOf(merged)).toEqual({
      terminals: ['dev-tab', 'tab-1', 'tab-2'],
      unified: ['dev-tab', 'tab-1', 'tab-2'],
      groups: [['group-1', ['dev-tab', 'tab-1', 'tab-2']]]
    })
    expect(Object.keys(merged?.terminalLayoutsByTabId ?? {}).sort()).toEqual([
      'dev-tab',
      'tab-1',
      'tab-2'
    ])
  })

  it('drops an imported tab prod has closed since the last sync', () => {
    const dev = sessionOf(['closed-in-prod', 'dev-tab'])
    const prod = parsed(sessionOf(['tab-1']))

    const merged = mergedOrcaDevSession(dev, prod, ['closed-in-prod'])

    expect(tabIdsOf(merged).terminals).toEqual(['dev-tab', 'tab-1'])
    expect(merged?.terminalLayoutsByTabId).not.toHaveProperty('closed-in-prod')
  })

  it("keeps Dev's focus and Dev's fork record over prod's imported one", () => {
    const dev = sessionOf(['tab-1', 'dev-tab'], 'group-1', {
      activeTabId: 'dev-tab',
      sleepingAgentSessionsByPaneKey: {
        'tab-1:leaf-1': agentRecord('tab-1', 'dev-fork'),
        'tab-2:leaf-1': agentRecord('tab-2', 'stale-import', true)
      }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        activeTabId: 'tab-1',
        sleepingAgentSessionsByPaneKey: {
          'tab-1:leaf-1': agentRecord('tab-1', 'prod-session', true)
        }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, ['tab-1', 'tab-2'])

    expect(merged?.activeTabId).toBe('dev-tab')
    expect(merged?.sleepingAgentSessionsByPaneKey).toEqual({
      'tab-1:leaf-1': expect.objectContaining({
        providerSession: { key: 'session_id', id: 'dev-fork' }
      })
    })
  })

  it("folds prod's tabs from a group Dev's layout lacks into Dev's active group", () => {
    const dev = sessionOf(['dev-tab'], 'dev-group', {
      tabGroupLayouts: { [WORKTREE]: { type: 'leaf', groupId: 'dev-group' } }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        tabGroupLayouts: { [WORKTREE]: { type: 'leaf', groupId: 'group-1' } }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, [])

    expect(tabIdsOf(merged).groups).toEqual([['dev-group', ['dev-tab', 'tab-1']]])
    expect(merged?.unifiedTabs?.[WORKTREE]?.map((tab) => tab.groupId)).toEqual([
      'dev-group',
      'dev-group'
    ])
    expect(merged?.tabGroupLayouts?.[WORKTREE]).toEqual({ type: 'leaf', groupId: 'dev-group' })
  })

  it("never carries prod's host fences or restart hints into Dev", () => {
    const dev = sessionOf(['dev-tab'], 'group-1', {
      terminalTopologyRevisionByRepoId: { repo: 3 },
      activeWorktreeIdsOnShutdown: [WORKTREE]
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        terminalTopologyRevisionByRepoId: { repo: 90, other: 5 },
        activeWorktreeIdsOnShutdown: ['prod-wt']
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, [])

    expect(merged?.terminalTopologyRevisionByRepoId).toEqual({ repo: 3 })
    expect(merged?.activeWorktreeIdsOnShutdown).toEqual([WORKTREE])
  })

  it("keeps a fork's split pane in an imported tab when prod syncs again", () => {
    const leaf = (leafId: string) => ({ type: 'leaf', leafId })
    const splitLayout = {
      root: {
        type: 'split',
        direction: 'horizontal',
        first: leaf('leaf-1'),
        second: leaf('leaf-2')
      },
      activeLeafId: 'leaf-2',
      expandedLeafId: null
    }
    const dev = sessionOf(['tab-1'], 'group-1', {
      terminalLayoutsByTabId: { 'tab-1': splitLayout },
      sleepingAgentSessionsByPaneKey: {
        'tab-1:leaf-1': agentRecord('tab-1', 'prod-old', true),
        'tab-1:leaf-2': { ...agentRecord('tab-1', 'dev-fork'), paneKey: 'tab-1:leaf-2' }
      }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        sleepingAgentSessionsByPaneKey: { 'tab-1:leaf-1': agentRecord('tab-1', 'prod-new', true) }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, ['tab-1'])

    expect(merged?.terminalLayoutsByTabId['tab-1']).toEqual(splitLayout)
    const sessionIds = Object.fromEntries(
      Object.entries(merged?.sleepingAgentSessionsByPaneKey ?? {}).map(([key, record]) => [
        key,
        record.providerSession?.id
      ])
    )
    expect(sessionIds).toEqual({ 'tab-1:leaf-1': 'prod-new', 'tab-1:leaf-2': 'dev-fork' })
  })

  it('keeps every distinct client-hosted browser page from both sides', () => {
    const page = (browserPageId: string) => ({
      v: 1,
      browserPageId,
      workspaceId: WORKTREE,
      browserProfileId: 'profile',
      url: `https://example.test/${browserPageId}`,
      title: browserPageId,
      pairedDeviceId: 'device',
      savedAt: 1
    })
    const dev = sessionOf(['dev-tab'], 'group-1', {
      clientHostedBrowserPagesByWorktree: { [WORKTREE]: [page('dev-page')] }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        clientHostedBrowserPagesByWorktree: { [WORKTREE]: [page('prod-a'), page('prod-b')] }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, [])

    expect(
      merged?.clientHostedBrowserPagesByWorktree?.[WORKTREE]?.map((row) => row.browserPageId)
    ).toEqual(['dev-page', 'prod-a', 'prod-b'])
  })

  it("restores Dev's selected tab after the merge, and the imported pane stays held", () => {
    const dev = sessionOf(['tab-2', 'tab-1', 'dev-tab'], 'group-1', {
      activeTabIdByWorktree: { [WORKTREE]: 'tab-2' }
    })
    const prod = parsed(
      sessionOf(['tab-1', 'tab-2'], 'group-1', {
        activeTabIdByWorktree: { [WORKTREE]: 'tab-1' },
        sleepingAgentSessionsByPaneKey: {
          'tab-2:leaf-1': agentRecord('tab-2', 'prod-session', true)
        }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, ['tab-1', 'tab-2'])

    expect(merged?.activeTabIdByWorktree?.[WORKTREE]).toBe('tab-2')
    expect(merged?.tabGroups?.[WORKTREE]?.[0]?.activeTabId).toBe('tab-2')
    // The renderer holds a record flagged as imported until it is clicked.
    expect(merged?.sleepingAgentSessionsByPaneKey?.['tab-2:leaf-1']?.importedFromProd).toBe(true)
  })

  it('keeps the same editor path open on two hosts as two rows', () => {
    const dev = sessionOf(['dev-tab'], 'group-1', {
      openFilesByWorktree: { [WORKTREE]: [openFile(null)] }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', {
        openFilesByWorktree: { [WORKTREE]: [openFile('remote-env')] }
      })
    )

    const merged = mergedOrcaDevSession(dev, prod, [])

    expect(
      merged?.openFilesByWorktree?.[WORKTREE]?.map((file) => file.runtimeEnvironmentId ?? 'local')
    ).toEqual(['local', 'remote-env'])
  })

  it("keeps Dev's unsaved editor draft and its tab when prod closed the imported tab", () => {
    const editorTab = { ...unifiedTab('editor-tab', 'group-1'), contentType: 'editor' }
    const draft = { ...openFile(null), dirtyDraftContent: 'unsaved' }
    const dev = sessionOf(['tab-1'], 'group-1', {
      unifiedTabs: {
        [WORKTREE]: [unifiedTab('tab-1', 'group-1'), { ...editorTab, entityId: draft.filePath }]
      },
      tabGroups: {
        [WORKTREE]: [
          {
            id: 'group-1',
            worktreeId: WORKTREE,
            activeTabId: 'tab-1',
            tabOrder: ['tab-1', 'editor-tab']
          }
        ]
      },
      openFilesByWorktree: { [WORKTREE]: [draft] }
    })
    const prod = parsed(
      sessionOf(['tab-1'], 'group-1', { openFilesByWorktree: { [WORKTREE]: [openFile(null)] } })
    )

    const merged = mergedOrcaDevSession(dev, prod, ['tab-1', 'editor-tab'])

    expect(merged?.unifiedTabs?.[WORKTREE]?.map((tab) => tab.id)).toContain('editor-tab')
    expect(merged?.openFilesByWorktree?.[WORKTREE]).toEqual([
      expect.objectContaining({ dirtyDraftContent: 'unsaved' })
    ])
  })

  it("takes prod's import whole when Dev has no session yet", () => {
    const prod = parsed(sessionOf(['tab-1']))
    expect(mergedOrcaDevSession(undefined, prod, [])).toEqual(prod)
  })

  it("leaves Dev alone when Dev's own session is unreadable", () => {
    const prod = parsed(sessionOf(['tab-1']))
    expect(mergedOrcaDevSession({ tabsByWorktree: 'broken' }, prod, [])).toBeNull()
  })
})

describe('importedTabIds', () => {
  it('lists every terminal and tab-bar tab of the import', () => {
    expect(importedTabIds(parsed(sessionOf(['tab-1', 'tab-2']))).sort()).toEqual(['tab-1', 'tab-2'])
  })
})
