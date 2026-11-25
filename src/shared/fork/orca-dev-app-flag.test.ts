import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadFlag(): Promise<boolean> {
  vi.resetModules()
  return (await import('./orca-dev-app-flag')).IS_ORCA_DEV_APP
}

describe('IS_ORCA_DEV_APP', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is off with neither the build define nor the env', async () => {
    expect(await loadFlag()).toBe(false)
  })

  it('honours ORCA_FORK_DEV_APP=1 in a child built without the define, such as orcad', async () => {
    vi.stubEnv('ORCA_FORK_DEV_APP', '1')
    expect(await loadFlag()).toBe(true)
  })

  it('lets the build define win over an inherited env, so prod never turns into Orca Dev', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', false)
    vi.stubEnv('ORCA_FORK_DEV_APP', '1')
    expect(await loadFlag()).toBe(false)
  })

  it('treats an empty value as off', async () => {
    vi.stubEnv('ORCA_FORK_DEV_APP', '')
    expect(await loadFlag()).toBe(false)
  })
})
