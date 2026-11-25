import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { openWritableProfileStateDatabase } from '../../persistence/profile-state/database/profile-state-database'
import { hasProfileStateDatabaseFiles } from '../../persistence/profile-state/database/profile-state-storage-classification'
import {
  readProfileStateDomains,
  readProfileStateDomainsWithRevisionFromDatabase
} from '../../persistence/profile-state/documents/profile-state-domain-reader'
import { writeProfileStateDomains } from '../../persistence/profile-state/documents/profile-state-domain-writes'
import { isRecord } from '../../persistence/profile-state/documents/profile-state-document-validation'
import { hasMissingProfileStateDatabaseWithRetainedAuthority } from '../network-compatibility/http1-compatibility-profile-state'
import {
  getOrcaProfileDataFile,
  getOrcaProfileStateDatabaseFile
} from '../../../shared/orca-profiles/profile-state-storage-paths'
import {
  SEEDED_PROFILE_STATE_DOMAINS,
  pickSeededProfileStateDomains
} from '../../../shared/orca-profiles/seeded-profile-state-domains'

export type OrcaDevProfileSyncPaths = { prodUserDataPath: string; devUserDataPath: string }

export type OrcaDevProfileSyncOutcome =
  | { profileId: string; kind: 'synced' | 'seeded' }
  | { profileId: string; kind: 'skipped'; reason: OrcaDevProfileSkipReason }
  | { profileId: string; kind: 'failed'; error: string }

type OrcaDevProfileSkipReason =
  | 'prod-database-missing'
  | 'prod-unreadable'
  | 'schema-mismatch'
  | 'dev-authority-retained'

export type OrcaDevProfileSyncReport =
  | { kind: 'prod-missing' }
  | { kind: 'done'; indexCopied: boolean; profiles: OrcaDevProfileSyncOutcome[] }

const PROFILE_INDEX_FILE_NAME = 'orca-profile-index.json'
const PROFILE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

/** One-way prod → Orca Dev copy of allowlisted state; only the DB, legacy JSON and index are written. */
export function syncOrcaDevProfilesFromProd(
  paths: OrcaDevProfileSyncPaths
): OrcaDevProfileSyncReport {
  const prodIndexPath = join(paths.prodUserDataPath, PROFILE_INDEX_FILE_NAME)
  const profileIds = readProfileIds(prodIndexPath)
  if (profileIds.length === 0) {
    return { kind: 'prod-missing' }
  }
  const profiles = profileIds.map((profileId) => syncProfile(paths, profileId))
  // Last, so the dev index never names a profile whose data is not written yet.
  const devIndexPath = join(paths.devUserDataPath, PROFILE_INDEX_FILE_NAME)
  const indexCopied = !existsSync(devIndexPath)
  if (indexCopied) {
    writePrivateFileAtomically(devIndexPath, readFileSync(prodIndexPath, 'utf8'))
  }
  return { kind: 'done', indexCopied, profiles }
}

function readProfileIds(indexPath: string): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(indexPath, 'utf8'))
    if (!isRecord(parsed) || !Array.isArray(parsed.profiles)) {
      return []
    }
    return parsed.profiles.flatMap((profile: unknown) =>
      isRecord(profile) && typeof profile.id === 'string' && PROFILE_ID_PATTERN.test(profile.id)
        ? [profile.id]
        : []
    )
  } catch {
    return []
  }
}

function syncProfile(paths: OrcaDevProfileSyncPaths, profileId: string): OrcaDevProfileSyncOutcome {
  const prodDatabaseFile = getOrcaProfileStateDatabaseFile(profileId, paths.prodUserDataPath)
  if (!existsSync(prodDatabaseFile)) {
    return { profileId, kind: 'skipped', reason: 'prod-database-missing' }
  }
  // Read-only snapshot: a running prod keeps writing, and committed WAL pages are included.
  const prod = readProfileStateDomains(prodDatabaseFile, profileId, SEEDED_PROFILE_STATE_DOMAINS)
  if (prod.kind === 'unreadable') {
    return { profileId, kind: 'skipped', reason: 'prod-unreadable' }
  }
  const picked = pickSeededProfileStateDomains(prod.values)
  const devDatabaseFile = getOrcaProfileStateDatabaseFile(profileId, paths.devUserDataPath)
  if (hasProfileStateDatabaseFiles(devDatabaseFile)) {
    return replaceDevDomains({ devDatabaseFile, profileId, picked })
  }
  if (hasMissingProfileStateDatabaseWithRetainedAuthority(paths.devUserDataPath, profileId)) {
    return { profileId, kind: 'skipped', reason: 'dev-authority-retained' }
  }
  // First launch: Orca migrates legacy JSON into SQLite itself, as with dev:seed-profile.
  const legacyFile = getOrcaProfileDataFile(profileId, paths.devUserDataPath)
  writePrivateFileAtomically(legacyFile, JSON.stringify(Object.fromEntries(picked)))
  return { profileId, kind: 'seeded' }
}

function replaceDevDomains(args: {
  devDatabaseFile: string
  profileId: string
  picked: ReadonlyMap<string, unknown>
}): OrcaDevProfileSyncOutcome {
  const { profileId, picked } = args
  let opened: ReturnType<typeof openWritableProfileStateDatabase> | undefined
  try {
    opened = openWritableProfileStateDatabase(args.devDatabaseFile, profileId)
    const dev = readProfileStateDomainsWithRevisionFromDatabase(opened.db, ['schemaVersion'])
    if (dev.kind === 'unreadable') {
      return { profileId, kind: 'failed', error: String(dev.error) }
    }
    // Different schemas need a migration the sync must not attempt.
    if (dev.values.get('schemaVersion') !== picked.get('schemaVersion')) {
      return { profileId, kind: 'skipped', reason: 'schema-mismatch' }
    }
    // One transaction with a revision fence: a failed copy leaves dev exactly as it was.
    writeProfileStateDomains(opened.db, {
      expectedRevision: dev.revision,
      replacements: SEEDED_PROFILE_STATE_DOMAINS.filter((domain) => domain !== 'schemaVersion').map(
        (domain) => ({
          domain,
          payload: picked.has(domain) ? JSON.stringify(picked.get(domain)) : null
        })
      )
    })
    return { profileId, kind: 'synced' }
  } catch (error) {
    return { profileId, kind: 'failed', error: String(error) }
  } finally {
    opened?.db.close()
  }
}

function writePrivateFileAtomically(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 })
  const temporaryPath = `${filePath}.orca-dev-sync.tmp`
  writeFileSync(temporaryPath, contents, { mode: 0o600 })
  renameSync(temporaryPath, filePath)
}
