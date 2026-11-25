import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadDescription(): Promise<string> {
  vi.resetModules()
  return (await import('./agent-status-hooks-copy')).getAgentStatusHooksDescription()
}

describe('agent status hooks setting copy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tells Orca Dev users the toggle is unavailable there', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    expect(await loadDescription()).toBe('Unavailable in Orca Dev. Use Orca to manage agent hooks.')
  })

  it('keeps the prod description', async () => {
    expect(await loadDescription()).toMatch(/^Shows working, waiting, and done states in Orca\./)
  })
})
