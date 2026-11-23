import { describe, expect, it } from 'vitest'
import { giteaConnectedSummary } from './gitea-card-summary'

const API_BASE_URL = 'https://git.example.test/api/v1'

describe('giteaConnectedSummary', () => {
  it('joins the account and the server host', () => {
    expect(giteaConnectedSummary('angelo', API_BASE_URL)).toBe('angelo · git.example.test')
  })

  it('falls back to whichever part is known', () => {
    expect(giteaConnectedSummary(null, API_BASE_URL)).toBe('git.example.test')
    expect(giteaConnectedSummary('angelo', 'not a url')).toBe('angelo')
    expect(giteaConnectedSummary(null, null)).toBeNull()
  })
})
