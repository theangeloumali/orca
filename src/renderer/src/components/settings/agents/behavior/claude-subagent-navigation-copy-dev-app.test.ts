import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadDescription(): Promise<string> {
  vi.resetModules()
  return (
    await import('./claude-subagent-navigation-copy')
  ).getClaudeSubagentNavigationDescription()
}

describe('Claude subagent navigation setting copy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tells Orca Dev users the toggle is unavailable there', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    expect(await loadDescription()).toBe(
      'Unavailable in Orca Dev. Use Orca to manage Claude subagent navigation.'
    )
  })

  it('keeps the prod description', async () => {
    expect(await loadDescription()).toMatch(/^Open Claude subagents from the sidebar\./)
  })
})
