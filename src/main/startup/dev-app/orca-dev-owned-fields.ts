import { isRecord } from '../../persistence/profile-state/documents/profile-state-document-validation'

// Fields Orca Dev keeps as its own instead of taking prod's.
const ORCA_DEV_OWNED_FIELDS: ReadonlyMap<string, readonly string[]> = new Map([
  [
    'settings',
    [
      // Prod's managed accounts point at its account dirs; Orca Dev uses the default logins.
      'claudeManagedAccounts',
      'activeClaudeManagedAccountId',
      'activeClaudeManagedAccountIdsByRuntime',
      'codexManagedAccounts',
      'activeCodexManagedAccountId',
      'activeCodexManagedAccountIdsByRuntime',
      // The name paired clients see; Orca Dev must never pose as prod.
      'machineName',
      // Sealed with prod's safeStorage key, which Orca Dev cannot open.
      'opencodeSessionCookie',
      'opencodeGoApiKey',
      'httpProxyUrl'
    ]
  ],
  ['ui', ['browserKagiSessionLink']]
])

export const ORCA_DEV_OWNED_DOMAINS: readonly string[] = [...ORCA_DEV_OWNED_FIELDS.keys()]

/** Prod's domains with each owned field taken from dev, or dropped when dev has none. */
export function withOrcaDevOwnedFields(
  prod: ReadonlyMap<string, unknown>,
  dev: ReadonlyMap<string, unknown>
): Map<string, unknown> {
  const merged = new Map(prod)
  for (const [domain, fields] of ORCA_DEV_OWNED_FIELDS) {
    const prodValue = prod.get(domain)
    if (!isRecord(prodValue)) {
      continue
    }
    const devValue = dev.get(domain)
    const devOwned = isRecord(devValue)
      ? Object.entries(devValue).filter(([field]) => fields.includes(field))
      : []
    const prodShared = Object.entries(prodValue).filter(([field]) => !fields.includes(field))
    merged.set(domain, Object.fromEntries([...prodShared, ...devOwned]))
  }
  return merged
}
