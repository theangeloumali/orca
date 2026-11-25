import { homedir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getOrcaHomeStateDir', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("is prod's ~/.orca outside Orca Dev", async () => {
    const { getOrcaHomeStateDir } = await import('./orca-home-state-dir')
    expect(getOrcaHomeStateDir('/Users/me')).toBe(join('/Users/me', '.orca'))
  })

  it('is ~/.orca-dev-app in Orca Dev', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    vi.resetModules()
    const { getOrcaHomeStateDir } = await import('./orca-home-state-dir')
    expect(getOrcaHomeStateDir('/Users/me')).toBe(join('/Users/me', '.orca-dev-app'))
  })

  it("keeps Orca Dev's speech key out of prod's store", async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    vi.resetModules()
    const { getOpenAiKeyPath } = await import('../../speech/openai-api-key-store')
    expect(getOpenAiKeyPath()).toBe(join(homedir(), '.orca-dev-app', 'openai-speech-token.enc'))
  })

  it("keeps Orca Dev's keybindings beside its own state", async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    vi.resetModules()
    const { getUserKeybindingsPath } = await import('../../keybindings/keybinding-file')
    expect(getUserKeybindingsPath('/Users/me')).toBe(
      join('/Users/me', '.orca-dev-app', 'keybindings.json')
    )
  })
})
