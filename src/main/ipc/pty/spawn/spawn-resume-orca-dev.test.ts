import { beforeEach, describe, expect, it, vi } from 'vitest'
import { seedResumeLaunchIdentityFromSpawn } from '../pane/resume-launch-identity'
import { forkOrcaDevProdOriginResume } from './spawn-resume'

const recordLaunchResumeIdentity = vi.hoisted(() => vi.fn())
const isClaudeSessionLiveOnThisMac = vi.hoisted(() =>
  vi.fn(async (sessionId: string, _settings?: unknown) => sessionId === 'live-session')
)

vi.mock('../../../../shared/fork/orca-dev-app-flag', () => ({ IS_ORCA_DEV_APP: true }))
vi.mock('../../../startup/dev-app/orca-dev-claude-liveness', () => ({
  isClaudeSessionLiveOnThisMac
}))
vi.mock('../../../agent-hooks/server/agent-hook-server', () => ({
  agentHookServer: { recordLaunchResumeIdentity }
}))

beforeEach(() => recordLaunchResumeIdentity.mockClear())

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

function publishSpawn(state: ReturnType<typeof resumeSpawn>): void {
  seedResumeLaunchIdentityFromSpawn({
    paneKey: 'tab-1:leaf-1',
    launchAgent: state.args.launchAgent,
    resumeProviderSession: state.args.resumeProviderSession,
    connectionId: null,
    worktreeId: 'wt-1',
    launchedAt: new Date(1),
    resumeArgvDropped: false,
    result: { id: 'pty-1' }
  })
}

describe('forkOrcaDevProdOriginResume', () => {
  it('forks a Claude resume another Orca is running', async () => {
    const state = resumeSpawn('live-session')
    await forkOrcaDevProdOriginResume(state, false)
    expect(state.spawnOptions.command).toBe('claude --resume live-session --fork-session')
  })

  it('forks a resume imported from prod even when prod is idle', async () => {
    const state = resumeSpawn('idle-session')
    await forkOrcaDevProdOriginResume(state, true)
    expect(state.spawnOptions.command).toBe('claude --resume idle-session --fork-session')
  })

  it('resumes a Dev-created idle session in place', async () => {
    const state = resumeSpawn('idle-session')
    await forkOrcaDevProdOriginResume(state, false)
    expect(state.spawnOptions.command).toBe('claude --resume idle-session')
    publishSpawn(state)
    expect(recordLaunchResumeIdentity).toHaveBeenCalledOnce()
  })

  it("publishes no prod id after a fork, so the pane records the fork's own", async () => {
    const state = resumeSpawn('idle-session')
    await forkOrcaDevProdOriginResume(state, true)
    publishSpawn(state)
    expect(recordLaunchResumeIdentity).not.toHaveBeenCalled()
  })

  it("checks liveness against the custom Claude homes in Dev's settings", async () => {
    const settings = { agentDefaultEnv: { claude: { CLAUDE_CONFIG_DIR: '/custom/claude' } } }
    const store = { getSettings: () => settings }
    const state = { ...resumeSpawn('idle-session'), deps: { store } }
    await forkOrcaDevProdOriginResume(state, false)
    expect(isClaudeSessionLiveOnThisMac).toHaveBeenCalledWith('idle-session', settings)
  })

  it('leaves WSL resumes to their own distro', async () => {
    const state = resumeSpawn('live-session', 'Ubuntu')
    await forkOrcaDevProdOriginResume(state, true)
    expect(state.spawnOptions.command).toBe('claude --resume live-session')
  })
})
