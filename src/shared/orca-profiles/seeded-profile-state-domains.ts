// Allowlist of profile-state domains: projects, workspaces, settings, and SSH targets.
// Terminal sessions, PTY leases, automations (they would run twice), and telemetry stay behind.
export const SEEDED_PROFILE_STATE_DOMAINS: readonly string[] = [
  'schemaVersion',
  'repos',
  'projects',
  'projectHostSetups',
  'projectGroups',
  'folderWorkspaces',
  'sparsePresetsByRepo',
  'worktreeMeta',
  'worktreeMetaByIdentity',
  'worktreeIdentityAliases',
  'worktreeLineageById',
  'workspaceLineageByChildKey',
  'settings',
  'ui',
  'onboarding',
  'sshTargets',
  'sshTargetGenerationCounter',
  'deletedSshConfigAliases',
  'removedSshTargetTombstones'
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Allowlisted domains only; AI vault search settings point at the source machine's vault. */
export function pickSeededProfileStateDomains(
  domains: ReadonlyMap<string, unknown>
): Map<string, unknown> {
  const picked = new Map<string, unknown>()
  for (const domain of SEEDED_PROFILE_STATE_DOMAINS) {
    if (domains.get(domain) !== undefined) {
      picked.set(domain, domains.get(domain))
    }
  }
  const settings = picked.get('settings')
  if (isRecord(settings)) {
    const { aiVaultSearch: _aiVaultSearch, ...portableSettings } = settings
    picked.set('settings', portableSettings)
  }
  return picked
}
