import { afterEach, describe, expect, it, vi } from 'vitest'

async function searchTitles(): Promise<string[]> {
  vi.resetModules()
  const { getAdvancedPaneSearchEntries } = await import('./advanced-search')
  return getAdvancedPaneSearchEntries().map((entry) => entry.title)
}

describe('Advanced settings search in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers Uninstall Orca in prod', async () => {
    expect(await searchTitles()).toContain('Uninstall Orca')
  })

  it("hides Uninstall Orca in Orca Dev, which would remove prod's serve agent and hooks", async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    expect(await searchTitles()).not.toContain('Uninstall Orca')
  })
})
