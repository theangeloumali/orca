import { describe, expect, it } from 'vitest'
import { prependOrcaCliDirToChildPath } from './orca-cli-child-path'

describe('prependOrcaCliDirToChildPath for a packaged app', () => {
  it("names Orca Dev's userData in the pane env, so its bundled CLI never reaches prod", () => {
    const env: Record<string, string> = { PATH: '/usr/bin' }
    const userDataPath = '/Users/me/Library/Application Support/OrcaDev'
    prependOrcaCliDirToChildPath(env, {
      isPackaged: true,
      userDataPath,
      resourcesPath: '/Applications/Orca Dev.app/Contents/Resources',
      platform: 'darwin'
    })
    expect(env.ORCA_USER_DATA_PATH).toBe(userDataPath)
    expect(env.PATH.split(':')[0]).toBe('/Applications/Orca Dev.app/Contents/Resources/bin')
  })
})
