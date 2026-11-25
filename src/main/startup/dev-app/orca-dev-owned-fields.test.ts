import { describe, expect, it } from 'vitest'
import { withOrcaDevOwnedFields } from './orca-dev-owned-fields'

const prodSettings = {
  theme: 'dark',
  machineName: 'M5',
  claudeManagedAccounts: [{ id: 'prod-claude' }],
  activeClaudeManagedAccountId: 'prod-claude',
  activeClaudeManagedAccountIdsByRuntime: { local: 'prod-claude' },
  codexManagedAccounts: [{ id: 'prod-codex' }],
  activeCodexManagedAccountId: 'prod-codex',
  activeCodexManagedAccountIdsByRuntime: { local: 'prod-codex' },
  opencodeSessionCookie: 'prod-sealed',
  opencodeGoApiKey: 'prod-sealed',
  httpProxyUrl: 'prod-sealed'
}

describe('withOrcaDevOwnedFields', () => {
  it("never syncs prod's machine name, managed accounts or sealed secrets", () => {
    const merged = withOrcaDevOwnedFields(
      new Map<string, unknown>([
        ['settings', prodSettings],
        ['ui', { sidebarWidth: 300, browserKagiSessionLink: 'prod-sealed' }]
      ]),
      new Map()
    )
    expect(merged.get('settings')).toEqual({ theme: 'dark' })
    expect(merged.get('ui')).toEqual({ sidebarWidth: 300 })
  })

  it("keeps Orca Dev's own values for those fields", () => {
    const devSettings = {
      theme: 'light',
      machineName: 'M5 (Orca Dev)',
      claudeManagedAccounts: [],
      activeClaudeManagedAccountId: null,
      opencodeSessionCookie: 'dev-sealed'
    }
    const merged = withOrcaDevOwnedFields(
      new Map<string, unknown>([
        ['settings', prodSettings],
        ['ui', { browserKagiSessionLink: 'prod-sealed' }]
      ]),
      new Map<string, unknown>([
        ['settings', devSettings],
        ['ui', { browserKagiSessionLink: 'dev-sealed' }]
      ])
    )
    expect(merged.get('settings')).toEqual({
      theme: 'dark',
      machineName: 'M5 (Orca Dev)',
      claudeManagedAccounts: [],
      activeClaudeManagedAccountId: null,
      opencodeSessionCookie: 'dev-sealed'
    })
    expect(merged.get('ui')).toEqual({ browserKagiSessionLink: 'dev-sealed' })
  })

  it('leaves other domains as prod has them', () => {
    const repos = [{ id: 'prod-repo' }]
    const merged = withOrcaDevOwnedFields(new Map<string, unknown>([['repos', repos]]), new Map())
    expect(merged.get('repos')).toBe(repos)
    expect(merged.has('settings')).toBe(false)
  })
})
