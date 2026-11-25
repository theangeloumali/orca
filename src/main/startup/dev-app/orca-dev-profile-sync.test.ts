import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import type * as SeededProfileStateDomains from '../../../shared/orca-profiles/seeded-profile-state-domains'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openProfileStateDatabase } from '../../persistence/profile-state/database/profile-state-database'
import { importProfileStateJson } from '../../persistence/profile-state/documents/profile-state-documents'
import { readProfileStateDomains } from '../../persistence/profile-state/documents/profile-state-domain-reader'
import { getOrcaProfileStateDatabaseFile } from '../../../shared/orca-profiles/profile-state-storage-paths'
import { syncOrcaDevProfilesFromProd } from './orca-dev-profile-sync'

const midSync = vi.hoisted(() => {
  const state: { run?: () => void } = {}
  return state
})

// Runs between the prod DB read and the index publish, like a prod write landing mid-sync.
vi.mock('../../../shared/orca-profiles/seeded-profile-state-domains', async (importOriginal) => {
  const actual = await importOriginal<typeof SeededProfileStateDomains>()
  return {
    ...actual,
    pickSeededProfileStateDomains: (
      ...args: Parameters<typeof actual.pickSeededProfileStateDomains>
    ) => {
      midSync.run?.()
      return actual.pickSeededProfileStateDomains(...args)
    }
  }
})

const PROFILE_ID = 'local-default'
const roots: string[] = []

afterEach(() => {
  midSync.run = undefined
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function makeUserDataPaths(): { prod: string; dev: string } {
  const root = mkdtempSync(join(tmpdir(), 'orca-dev-sync-'))
  roots.push(root)
  return { prod: join(root, 'orca'), dev: join(root, 'OrcaDev') }
}

function writeProfileIndex(userDataPath: string): void {
  mkdirSync(userDataPath, { recursive: true })
  const index = { activeProfileId: PROFILE_ID, profiles: [{ id: PROFILE_ID }] }
  writeFileSync(join(userDataPath, 'orca-profile-index.json'), JSON.stringify(index))
}

/** Leaves the connection open so writes stay in the WAL, like a running Orca. */
function openProfileWith(userDataPath: string, state: Record<string, unknown>) {
  writeProfileIndex(userDataPath)
  mkdirSync(join(userDataPath, 'profiles', PROFILE_ID), { recursive: true })
  const { db } = openProfileStateDatabase(
    getOrcaProfileStateDatabaseFile(PROFILE_ID, userDataPath),
    PROFILE_ID
  )
  importProfileStateJson(db, JSON.stringify(state))
  return db
}

function writeProfile(userDataPath: string, state: Record<string, unknown>): void {
  openProfileWith(userDataPath, state).close()
}

function readDomains(userDataPath: string, domains: string[]): ReadonlyMap<string, unknown> {
  const result = readProfileStateDomains(
    getOrcaProfileStateDatabaseFile(PROFILE_ID, userDataPath),
    PROFILE_ID,
    domains
  )
  if (result.kind !== 'values') {
    throw new Error('test database unreadable')
  }
  return result.values
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort()
}

const prodState = {
  schemaVersion: 7,
  repos: [{ id: 'prod-repo' }],
  settings: { theme: 'dark', aiVaultSearch: { vault: '/prod/vault' } },
  automations: [{ id: 'nightly' }],
  worktreeMeta: { 'repo::wt': { displayName: 'first' } }
}

describe('syncOrcaDevProfilesFromProd', () => {
  it('replaces allowlisted domains and keeps the dev-only ones', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 7, repos: [], terminalSessions: { dev: true } })

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toEqual({
      kind: 'done',
      indexAdded: [],
      profiles: [{ profileId: PROFILE_ID, kind: 'synced' }]
    })
    const dev = readDomains(paths.dev, ['repos', 'settings', 'automations', 'terminalSessions'])
    expect(dev.get('repos')).toEqual([{ id: 'prod-repo' }])
    expect(dev.get('settings')).toEqual({ theme: 'dark' })
    expect(dev.has('automations')).toBe(false)
    expect(dev.get('terminalSessions')).toEqual({ dev: true })
  })

  it('mirrors a domain prod no longer has as a delete', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 7, sshTargets: [{ id: 'stale' }] })

    syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })

    expect(readDomains(paths.dev, ['sshTargets']).has('sshTargets')).toBe(false)
  })

  it('reads committed WAL pages while prod still holds its database open', () => {
    const paths = makeUserDataPaths()
    const prodDb = openProfileWith(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 7 })
    try {
      syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })
    } finally {
      prodDb.close()
    }
    expect(readDomains(paths.dev, ['repos']).get('repos')).toEqual([{ id: 'prod-repo' }])
  })

  it('refreshes split domains on every sync', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 7 })
    const sync = () =>
      syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })
    sync()
    const renamed = { ...prodState, worktreeMeta: { 'repo::wt': { displayName: 'second' } } }
    rmSync(paths.prod, { recursive: true })
    writeProfile(paths.prod, renamed)
    sync()

    expect(readDomains(paths.dev, ['worktreeMeta']).get('worktreeMeta')).toEqual(
      renamed.worktreeMeta
    )
  })

  it('does nothing when prod has no profile', () => {
    const paths = makeUserDataPaths()
    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })
    expect(report).toEqual({ kind: 'prod-missing' })
    expect(() => statSync(paths.dev)).toThrow()
  })

  it('seeds a first launch with private legacy JSON and never copies identity files', async () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    const profileDir = join(paths.prod, 'profiles', PROFILE_ID)
    for (const name of [
      'orca-devices.json',
      'orca-e2ee-keypair.json',
      'paired-desktop-instance-id',
      'agent-session-authority.key',
      'mobile-push-unregister-outbox.json',
      'mobile-relay-revoke-outbox.json',
      'orca.sock',
      'orcad.lock',
      'SingletonLock',
      'Local State'
    ]) {
      writeFileSync(join(paths.prod, name), 'secret')
    }
    writeFileSync(join(profileDir, 'account-session.json.enc'), 'secret')
    mkdirSync(join(paths.prod, '.profile-state-access'))
    writeFileSync(join(paths.prod, '.profile-state-access', 'lease'), 'secret')

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toEqual({
      kind: 'done',
      indexAdded: [PROFILE_ID],
      profiles: [{ profileId: PROFILE_ID, kind: 'seeded' }]
    })
    const legacyFile = join('profiles', PROFILE_ID, 'orca-data.json')
    expect(listFiles(paths.dev)).toEqual([legacyFile, 'orca-profile-index.json'].sort())
    expect(statSync(join(paths.dev, legacyFile)).mode & 0o777).toBe(0o600)
    expect(JSON.parse(await readFile(join(paths.dev, legacyFile), 'utf8'))).toEqual({
      schemaVersion: 7,
      repos: [{ id: 'prod-repo' }],
      settings: { theme: 'dark' },
      worktreeMeta: prodState.worktreeMeta
    })
  })

  it('skips a profile whose dev schema differs from prod', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 8, repos: [{ id: 'dev-repo' }] })

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toMatchObject({
      profiles: [{ profileId: PROFILE_ID, kind: 'skipped', reason: 'schema-mismatch' }]
    })
    expect(readDomains(paths.dev, ['repos']).get('repos')).toEqual([{ id: 'dev-repo' }])
  })

  it('leaves dev untouched when the copy fails mid-write', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    const devDb = openProfileWith(paths.dev, { schemaVersion: 7, repos: [{ id: 'dev-repo' }] })
    devDb.exec(
      `CREATE TRIGGER fail_settings_insert BEFORE INSERT ON profile_state_documents
       WHEN NEW.domain = 'settings' BEGIN SELECT RAISE(ABORT, 'disk full'); END`
    )
    devDb.close()

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toMatchObject({ profiles: [{ profileId: PROFILE_ID, kind: 'failed' }] })
    expect(readDomains(paths.dev, ['repos']).get('repos')).toEqual([{ id: 'dev-repo' }])
  })

  it("keeps Orca Dev's machine name and account logins across a sync", () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, {
      ...prodState,
      settings: { theme: 'dark', machineName: 'M5', claudeManagedAccounts: [{ id: 'prod' }] }
    })
    writeProfile(paths.dev, {
      schemaVersion: 7,
      settings: { theme: 'light', machineName: 'M5 (Orca Dev)', claudeManagedAccounts: [] }
    })

    syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })

    expect(readDomains(paths.dev, ['settings']).get('settings')).toEqual({
      theme: 'dark',
      machineName: 'M5 (Orca Dev)',
      claudeManagedAccounts: []
    })
  })

  it('adds new prod profiles to an existing dev index without touching its own edits', async () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    writeProfile(paths.dev, { schemaVersion: 7 })
    const devIndex = {
      schemaVersion: 1,
      activeProfileId: 'dev-only',
      profiles: [
        { id: PROFILE_ID, name: 'Renamed in dev' },
        { id: 'dev-only', name: 'Dev only' }
      ]
    }
    writeFileSync(join(paths.dev, 'orca-profile-index.json'), JSON.stringify(devIndex))
    const prodIndex = {
      schemaVersion: 1,
      activeProfileId: PROFILE_ID,
      profiles: [
        { id: PROFILE_ID, name: 'Default' },
        { id: 'work', name: 'Work' }
      ]
    }
    writeFileSync(join(paths.prod, 'orca-profile-index.json'), JSON.stringify(prodIndex))

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toMatchObject({ kind: 'done', indexAdded: ['work'] })
    expect(JSON.parse(await readFile(join(paths.dev, 'orca-profile-index.json'), 'utf8'))).toEqual({
      ...devIndex,
      profiles: [...devIndex.profiles, { id: 'work', name: 'Work' }]
    })
  })
  it('publishes the prod index read with the synced data, not one prod wrote mid-sync', async () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodState)
    const prodIndexPath = join(paths.prod, 'orca-profile-index.json')
    const snapshot = JSON.parse(await readFile(prodIndexPath, 'utf8'))
    midSync.run = () => {
      const later = { ...snapshot, profiles: [...snapshot.profiles, { id: 'added-mid-sync' }] }
      writeFileSync(prodIndexPath, JSON.stringify(later))
    }

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toMatchObject({ kind: 'done', indexAdded: [PROFILE_ID] })
    const devIndex = JSON.parse(await readFile(join(paths.dev, 'orca-profile-index.json'), 'utf8'))
    expect(devIndex).toEqual(snapshot)
  })
})

const WORKTREE = 'wt-1::/repo'
const LIVE_PTY = `${WORKTREE}@@0a1b2c3d`
const PANE_KEY = 'tab-1:leaf-1'
const providerSession = { key: 'session_id', id: 'claude-session-1', cwd: '/repo' }

function unifiedTab(id: string, contentType: 'terminal' | 'agent-session') {
  const tab = { id, entityId: id, groupId: 'group-1', worktreeId: WORKTREE, contentType }
  return { ...tab, label: id, customLabel: null, color: null, sortOrder: 0, createdAt: 1 }
}

function sessionWith(ptyId: string, state: 'working' | 'done') {
  return {
    activeRepoId: 'prod-repo',
    activeWorktreeId: WORKTREE,
    activeTabId: 'tab-1',
    tabsByWorktree: {
      [WORKTREE]: [
        {
          id: 'tab-1',
          ptyId,
          worktreeId: WORKTREE,
          title: 'claude',
          customTitle: null,
          color: null,
          sortOrder: 0,
          createdAt: 1
        }
      ]
    },
    terminalLayoutsByTabId: {
      'tab-1': {
        root: { type: 'leaf', leafId: 'leaf-1' },
        activeLeafId: 'leaf-1',
        expandedLeafId: null,
        ptyIdsByLeafId: { 'leaf-1': ptyId }
      }
    },
    unifiedTabs: {
      [WORKTREE]: [unifiedTab('tab-1', 'terminal'), unifiedTab('chat-1', 'agent-session')]
    },
    tabGroups: {
      [WORKTREE]: [
        { id: 'group-1', worktreeId: WORKTREE, activeTabId: 'tab-1', tabOrder: ['tab-1', 'chat-1'] }
      ]
    },
    terminalPtyIncarnationsByPaneKey: { [PANE_KEY]: 'incarnation-1' },
    activeConnectionIdsAtShutdown: ['ssh-1'],
    remoteSessionIdsByTabId: { 'tab-1': 'remote-1' },
    sleepingAgentSessionsByPaneKey: {
      [PANE_KEY]: {
        paneKey: PANE_KEY,
        tabId: 'tab-1',
        worktreeId: WORKTREE,
        agent: 'claude',
        providerSession,
        connectionId: null,
        prompt: 'ship it',
        state,
        capturedAt: 1,
        updatedAt: 1,
        origin: 'live'
      }
    }
  }
}

const prodWithSessions = {
  ...prodState,
  workspaceSession: sessionWith(LIVE_PTY, 'working'),
  claudeLivePtySessionIds: [LIVE_PTY],
  sshRemotePtyLeases: [{ ptyId: LIVE_PTY }]
}

// The -shm is SQLite's shared WAL index, which every reader updates; the data lives in the db and WAL.
function hashTree(directory: string): Map<string, string> {
  return new Map(
    listFiles(directory)
      .filter((name) => !name.endsWith('-shm'))
      .map((name) => [
        name,
        createHash('sha256')
          .update(readFileSync(join(directory, name)))
          .digest('hex')
      ])
  )
}

describe('syncOrcaDevProfilesFromProd sessions', () => {
  it('carries every prod tab and agent stopped, with no live PTY or lease ids', () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodWithSessions)
    writeProfile(paths.dev, { schemaVersion: 7 })

    syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })

    const dev = readDomains(paths.dev, [
      'workspaceSession',
      'claudeLivePtySessionIds',
      'sshRemotePtyLeases'
    ])
    expect(dev.has('claudeLivePtySessionIds')).toBe(false)
    expect(dev.has('sshRemotePtyLeases')).toBe(false)
    const session = dev.get('workspaceSession')
    expect(JSON.stringify(session)).not.toContain('@@')
    expect(session).toMatchObject({
      activeTabId: 'tab-1',
      tabsByWorktree: { [WORKTREE]: [{ id: 'tab-1', ptyId: null }] },
      terminalLayoutsByTabId: { 'tab-1': { activeLeafId: 'leaf-1' } },
      sleepingAgentSessionsByPaneKey: {
        [PANE_KEY]: {
          providerSession,
          origin: 'worktree-sleep',
          state: 'done',
          restoreOnTabOpenOnly: true
        }
      }
    })
    // Native chats live in the journal, which stays in prod.
    expect(session).toMatchObject({
      unifiedTabs: { [WORKTREE]: [{ id: 'tab-1' }] },
      tabGroups: { [WORKTREE]: [{ tabOrder: ['tab-1'] }] }
    })
    expect(JSON.stringify(session)).not.toContain('chat-1')
    expect(session).not.toHaveProperty('terminalPtyIncarnationsByPaneKey')
    expect(session).not.toHaveProperty('activeConnectionIdsAtShutdown')
    expect(session).not.toHaveProperty('remoteSessionIdsByTabId')
  })

  it('seeds a first launch with the stopped session', async () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodWithSessions)

    syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })

    const legacy = JSON.parse(
      await readFile(join(paths.dev, 'profiles', PROFILE_ID, 'orca-data.json'), 'utf8')
    )
    expect(JSON.stringify(legacy)).not.toContain('@@')
    expect(legacy).not.toHaveProperty('claudeLivePtySessionIds')
    expect(legacy.workspaceSession.sleepingAgentSessionsByPaneKey[PANE_KEY]).toMatchObject({
      state: 'done',
      restoreOnTabOpenOnly: true
    })
  })

  it("never changes prod's bytes while prod holds its database open", () => {
    const paths = makeUserDataPaths()
    const prodDb = openProfileWith(paths.prod, prodWithSessions)
    writeProfile(paths.dev, { schemaVersion: 7 })
    try {
      const before = hashTree(paths.prod)
      syncOrcaDevProfilesFromProd({ prodUserDataPath: paths.prod, devUserDataPath: paths.dev })
      expect(hashTree(paths.prod)).toEqual(before)
    } finally {
      prodDb.close()
    }
  })

  it("keeps Dev's previous session when the copy fails mid-write", () => {
    const paths = makeUserDataPaths()
    writeProfile(paths.prod, prodWithSessions)
    const devSession = sessionWith('', 'done')
    const devDb = openProfileWith(paths.dev, { schemaVersion: 7, workspaceSession: devSession })
    devDb.exec(
      `CREATE TRIGGER fail_settings_insert BEFORE INSERT ON profile_state_documents
       WHEN NEW.domain = 'settings' BEGIN SELECT RAISE(ABORT, 'disk full'); END`
    )
    devDb.close()
    const before = readDomains(paths.dev, ['workspaceSession']).get('workspaceSession')

    const report = syncOrcaDevProfilesFromProd({
      prodUserDataPath: paths.prod,
      devUserDataPath: paths.dev
    })

    expect(report).toMatchObject({ profiles: [{ profileId: PROFILE_ID, kind: 'failed' }] })
    expect(readDomains(paths.dev, ['workspaceSession']).get('workspaceSession')).toEqual(before)
  })
})
