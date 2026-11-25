import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { resolveBuilderAppIdentity } = createRequire(import.meta.url)(
  './orca-dev-app-builder-identity.cjs'
)

describe('resolveBuilderAppIdentity', () => {
  it('keeps the prod bundle identity without ORCA_FORK_DEV_APP', () => {
    expect(resolveBuilderAppIdentity({})).toEqual({
      appId: 'com.stablyai.orca',
      productName: 'Orca',
      urlScheme: 'orca',
      macIcon: 'resources/build/icon.icns'
    })
  })

  it('gives Orca Dev its own bundle id, name, URL scheme and DEV icon', () => {
    expect(resolveBuilderAppIdentity({ ORCA_FORK_DEV_APP: '1' })).toEqual({
      appId: 'com.theangeloumali.orca.dev',
      productName: 'Orca Dev',
      urlScheme: 'orca-dev',
      macIcon: 'resources/build/icon-dev.icns'
    })
  })

  it('refuses Orca Dev on a release channel, which would sign it as prod', () => {
    expect(() =>
      resolveBuilderAppIdentity({ ORCA_FORK_DEV_APP: '1', ORCA_MAC_RELEASE: '1' })
    ).toThrow(/release/)
  })
})
