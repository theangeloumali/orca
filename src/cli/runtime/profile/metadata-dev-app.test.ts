import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlatformUserDataPath } from './metadata'

describe('getPlatformUserDataPath in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("defaults the bundled CLI to Orca Dev's own userData", () => {
    expect(getPlatformUserDataPath('darwin', '/Users/me', true)).toBe(
      join('/Users/me', 'Library', 'Application Support', 'OrcaDev')
    )
  })

  it("keeps prod's userData when the flag is off", () => {
    expect(getPlatformUserDataPath('darwin', '/Users/me', false)).toBe(
      join('/Users/me', 'Library', 'Application Support', 'orca')
    )
  })

  it('takes the default from the dev-app build flag', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    vi.resetModules()
    const metadata = await import('./metadata.js')
    expect(metadata.getPlatformUserDataPath('darwin', '/Users/me')).toBe(
      join('/Users/me', 'Library', 'Application Support', 'OrcaDev')
    )
  })
})
