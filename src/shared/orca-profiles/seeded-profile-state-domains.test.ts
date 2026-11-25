import { describe, expect, it } from 'vitest'
import {
  SEEDED_PROFILE_STATE_DOMAINS,
  pickSeededProfileStateDomains
} from './seeded-profile-state-domains'

describe('seeded profile-state domains', () => {
  it('copies configuration but never sessions, automations or telemetry', () => {
    expect(SEEDED_PROFILE_STATE_DOMAINS).toContain('repos')
    expect(SEEDED_PROFILE_STATE_DOMAINS).toContain('settings')
    for (const domain of ['terminalSessions', 'automations', 'automationRuns', 'telemetry']) {
      expect(SEEDED_PROFILE_STATE_DOMAINS).not.toContain(domain)
    }
  })

  it('keeps only allowlisted domains that are present', () => {
    const picked = pickSeededProfileStateDomains(
      new Map<string, unknown>([
        ['repos', [{ id: 'r1' }]],
        ['automations', [{ id: 'a1' }]]
      ])
    )
    expect(picked).toEqual(new Map([['repos', [{ id: 'r1' }]]]))
  })

  it('drops the AI vault search settings without mutating the source', () => {
    const settings = { theme: 'dark', aiVaultSearch: { enabled: true } }
    const picked = pickSeededProfileStateDomains(new Map([['settings', settings]]))
    expect(picked.get('settings')).toEqual({ theme: 'dark' })
    expect(settings.aiVaultSearch).toEqual({ enabled: true })
  })
})
