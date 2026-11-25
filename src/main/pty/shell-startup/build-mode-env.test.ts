import { describe, expect, it } from 'vitest'
import { stripInheritedBuildModeEnv } from './build-mode-env'

describe('stripInheritedBuildModeEnv', () => {
  it("keeps an Orca Dev orcad's identity out of its terminals, where it would flip user tests and tools", () => {
    const env = stripInheritedBuildModeEnv({
      NODE_ENV: 'production',
      ORCA_FORK_DEV_APP: '1',
      HOME: '/h'
    })
    expect(env).toEqual({ HOME: '/h' })
  })
})
