import { describe, expect, it, vi } from 'vitest'
import { forkOrcaDevResumeWhenLive } from './spawn-resume'

vi.mock('../../../../shared/fork/orca-dev-app-flag', () => ({ IS_ORCA_DEV_APP: true }))
vi.mock('../../../startup/dev-app/orca-dev-claude-liveness', () => ({
  isClaudeSessionLiveOnThisMac: async (sessionId: string) => sessionId === 'live-session'
}))

function resumeSpawn(sessionId: string, wslDistro: string | null = null) {
  const command = `claude --resume ${sessionId}`
  return {
    args: {
      cols: 80,
      rows: 24,
      command,
      launchAgent: 'claude' as const,
      resumeProviderSession: { key: 'session_id' as const, id: sessionId }
    },
    spawnOptions: { cols: 80, rows: 24, cwd: '/repo', command, env: {} },
    expectedWslDistro: wslDistro,
    resumeAdmission: null
  }
}

describe('forkOrcaDevResumeWhenLive', () => {
  it('forks a Claude resume another Orca is running', async () => {
    const state = resumeSpawn('live-session')
    await forkOrcaDevResumeWhenLive(state)
    expect(state.spawnOptions.command).toBe('claude --resume live-session --fork-session')
  })

  it('resumes an idle session in place', async () => {
    const state = resumeSpawn('idle-session')
    await forkOrcaDevResumeWhenLive(state)
    expect(state.spawnOptions.command).toBe('claude --resume idle-session')
  })

  it('leaves WSL resumes to their own distro', async () => {
    const state = resumeSpawn('live-session', 'Ubuntu')
    await forkOrcaDevResumeWhenLive(state)
    expect(state.spawnOptions.command).toBe('claude --resume live-session')
  })
})
