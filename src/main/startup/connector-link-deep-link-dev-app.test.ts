import { afterEach, describe, expect, it, vi } from 'vitest'

const TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

async function loadDeepLinks(isDevApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', isDevApp)
  vi.resetModules()
  return import('./connector-link-deep-link')
}

describe('connector link scheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("sends Orca Dev's connector links to orca-dev://, which prod Orca never claims", async () => {
    const { formatConnectorLinkDeepLink, parseConnectorLinkDeepLink } = await loadDeepLinks(true)
    const link = formatConnectorLinkDeepLink({ source: 'linear', token: TOKEN })
    expect(link).toBe(`orca-dev://linear/link?t=${TOKEN}`)
    expect(parseConnectorLinkDeepLink(link)).toEqual({ source: 'linear', token: TOKEN })
    expect(parseConnectorLinkDeepLink(`orca://linear/link?t=${TOKEN}`)).toBeNull()
  })

  it('keeps orca:// in prod', async () => {
    const { formatConnectorLinkDeepLink, parseConnectorLinkDeepLink } = await loadDeepLinks(false)
    const link = formatConnectorLinkDeepLink({ source: 'github', token: TOKEN })
    expect(link).toBe(`orca://github/link?t=${TOKEN}`)
    expect(parseConnectorLinkDeepLink(link)).toEqual({ source: 'github', token: TOKEN })
    expect(parseConnectorLinkDeepLink(`orca-dev://github/link?t=${TOKEN}`)).toBeNull()
  })
})
