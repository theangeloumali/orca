import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAgentResumeArgv } from '../../../shared/agent-launch/startup/agent-resume-argv'
import type { ResumableTuiAgent } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import { buildAgentResumeLaunchCommand } from '../../../shared/agent-launch/startup/agent-resume-launch-command'
import {
  SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV,
  SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV
} from '../../../shared/agent-launch/startup/setup-agent-sequencing'
import type { ResumeSpawnAdmission } from '../../ipc/pty/host-env/saved-resume-admission'
import { isClaudeSessionLive, listOrcaDevClaudeHomes } from './orca-dev-claude-liveness'
import { forkProdOriginResume } from './orca-dev-resume-fork'

const SESSION_ID = '078afcaa-5715-427b-adbc-c88930d87da3'
const providerSession = { key: 'session_id' as const, id: SESSION_ID }
const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'orca-dev-fork-'))
  roots.push(root)
  return root
}

/** A Claude home whose registry names SESSION_ID under pid, plus that session's transcript. */
function claudeHome(pid: number): string {
  const home = join(tempRoot(), 'home')
  mkdirSync(join(home, 'sessions'), { recursive: true })
  mkdirSync(join(home, 'projects', 'repo'), { recursive: true })
  writeFileSync(
    join(home, 'sessions', `${pid}.json`),
    JSON.stringify({ pid, sessionId: SESSION_ID })
  )
  writeFileSync(join(home, 'sessions', `${pid}.abc.key`), '{"peerToken":"x"}')
  writeFileSync(join(home, 'projects', 'repo', `${SESSION_ID}.jsonl`), '{"type":"user"}\n')
  return home
}

function hashTree(home: string): string {
  const files = ['sessions', 'projects/repo'].flatMap((dir) =>
    [`${process.pid}.json`, `${SESSION_ID}.jsonl`].map((name) => join(home, dir, name))
  )
  const hash = createHash('sha256')
  for (const file of files) {
    try {
      hash.update(readFileSync(file))
    } catch {
      hash.update('-')
    }
  }
  return hash.digest('hex')
}

function resumeCommandFor(agent: ResumableTuiAgent, session = providerSession): string {
  const argv = getAgentResumeArgv(agent, session) ?? []
  return buildAgentResumeLaunchCommand(agent, argv[0] ?? agent, argv, 'posix')
}

const resumeCommand = resumeCommandFor('claude')

function savedResume(
  command = resumeCommand,
  agent: ResumableTuiAgent = 'claude',
  session = providerSession
) {
  const admission: ResumeSpawnAdmission = {
    verdict: 'admitted',
    refused: { agent, providerSession: session }
  }
  const args: {
    command?: string
    connectionId?: string
    launchAgent?: ResumableTuiAgent
    resumeProviderSession?: typeof session
  } = { command, launchAgent: agent, resumeProviderSession: session }
  const options: {
    command?: string
    env?: Record<string, string>
    resumeProviderSession?: typeof session
  } = { command, env: {}, resumeProviderSession: session }
  return { admission, args, options }
}

const idle = async () => false
const imported = { importedFromProd: true, isSessionLive: idle }
const devCreated = { importedFromProd: false, isSessionLive: idle }

describe('isClaudeSessionLive', () => {
  it('finds a session whose registered pid answers', async () => {
    const home = claudeHome(process.pid)
    await expect(isClaudeSessionLive(SESSION_ID, [home])).resolves.toBe(true)
  })

  it('treats a dead pid, another session or a missing registry as idle', async () => {
    const home = claudeHome(process.pid)
    await expect(isClaudeSessionLive(SESSION_ID, [home], () => false)).resolves.toBe(false)
    await expect(isClaudeSessionLive('other-session', [home])).resolves.toBe(false)
    await expect(isClaudeSessionLive(SESSION_ID, [join(tempRoot(), 'none')])).resolves.toBe(false)
  })

  it('lists prod and Dev profile homes plus the default ~/.claude', async () => {
    const appData = tempRoot()
    for (const dir of ['orca', 'OrcaDev']) {
      mkdirSync(join(appData, dir, 'claude-profiles', `acct-${dir}`, 'home'), { recursive: true })
    }
    await expect(listOrcaDevClaudeHomes(appData, '/Users/me')).resolves.toEqual([
      join(appData, 'orca', 'claude-profiles', 'acct-orca', 'home'),
      join(appData, 'OrcaDev', 'claude-profiles', 'acct-OrcaDev', 'home'),
      join('/Users/me', '.claude')
    ])
  })
})

describe('forkProdOriginResume', () => {
  it('forks a session prod is running and leaves its files unchanged', async () => {
    const home = claudeHome(process.pid)
    const before = hashTree(home)
    const { admission, args, options } = savedResume()
    options.env = { [SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]: resumeCommand }
    const isSessionLive = (sessionId: string) => isClaudeSessionLive(sessionId, [home])

    const next = await forkProdOriginResume(args, options, admission, {
      importedFromProd: false,
      isSessionLive
    })

    expect(next).toEqual(admission)
    expect(options.command).toBe(`${resumeCommand} '--fork-session'`)
    expect(options.env[SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]).toBe(
      `${resumeCommand} '--fork-session'`
    )
    expect(hashTree(home)).toBe(before)
  })

  it('resumes a Dev-created idle session in place', async () => {
    const { admission, args, options } = savedResume()

    const next = await forkProdOriginResume(args, options, admission, devCreated)

    expect(next).toEqual(admission)
    expect(options.command).toBe(resumeCommand)
    expect(args.resumeProviderSession).toEqual(providerSession)
  })

  it('forks every resume imported from prod, even one prod is not running', async () => {
    const { admission, args, options } = savedResume()

    const next = await forkProdOriginResume(args, options, admission, imported)

    expect(next).toEqual(admission)
    expect(options.command).toBe(`${resumeCommand} '--fork-session'`)
  })

  it("withholds prod's session id so the pane records the fork's new one", async () => {
    const { admission, args, options } = savedResume()

    await forkProdOriginResume(args, options, admission, imported)

    expect(args.resumeProviderSession).toBeUndefined()
    expect(options.resumeProviderSession).toBeUndefined()
  })

  it('forks imported Codex, Grok and Pi resumes with their own fork command', async () => {
    const pi = { ...providerSession, transcriptPath: '/tmp/pi/session.jsonl' }
    const cases = [
      { agent: 'codex' as const, session: providerSession, fork: `codex 'fork' '${SESSION_ID}'` },
      {
        agent: 'grok' as const,
        session: providerSession,
        fork: `grok '--resume' '${SESSION_ID}' '--fork-session'`
      },
      { agent: 'pi' as const, session: pi, fork: "pi '--fork' '/tmp/pi/session.jsonl'" }
    ]
    for (const { agent, session, fork } of cases) {
      const { admission, args, options } = savedResume(
        resumeCommandFor(agent, session),
        agent,
        session
      )

      await expect(forkProdOriginResume(args, options, admission, imported)).resolves.toEqual(
        admission
      )
      expect(options.command).toBe(fork)
    }
  })

  it('keeps the recorded Claude effort on the fork', async () => {
    const session = { ...providerSession, effort: 'high' }
    const command = resumeCommandFor('claude', session)
    const { admission, args, options } = savedResume(command, 'claude', session)

    await forkProdOriginResume(args, options, admission, imported)

    expect(options.command).toBe(`${command} '--fork-session'`)
  })

  it('opens a plain shell for an imported agent that has no fork command', async () => {
    const { admission, args, options } = savedResume(resumeCommandFor('gemini'), 'gemini')

    const next = await forkProdOriginResume(args, options, admission, imported)

    expect(next).toEqual({ verdict: 'unverifiable', refused: admission.refused })
    expect(options.command).toBeUndefined()
    expect(args.command).toBeUndefined()
  })

  it('refuses a forkable resume whose commands carry no resume argv to rewrite', async () => {
    const { admission, args, options } = savedResume('claude')

    const next = await forkProdOriginResume(args, options, admission, imported)

    expect(next).toEqual({ verdict: 'unverifiable', refused: admission.refused })
    expect(options.command).toBeUndefined()
  })

  it('refuses a live resume whose command it cannot rewrite exactly', async () => {
    const odd = `claude --resume ${SESSION_ID} --model opus`
    const { admission, args, options } = savedResume(odd)

    const next = await forkProdOriginResume(args, options, admission, imported)

    expect(next).toEqual({ verdict: 'unverifiable', refused: admission.refused })
    expect(options.command).toBeUndefined()
    expect(args.command).toBeUndefined()
  })

  it('refuses a resume buried in a sequenced startup script', async () => {
    const { admission, args, options } = savedResume()
    options.env = { [SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV]: `wait; ${resumeCommand}` }

    const next = await forkProdOriginResume(args, options, admission, imported)

    expect(next?.verdict).toBe('unverifiable')
  })

  it('forks a user-started resume of a live session too', async () => {
    const { args, options } = savedResume()

    const next = await forkProdOriginResume(args, options, null, {
      importedFromProd: false,
      isSessionLive: async () => true
    })

    expect(next).toBeNull()
    expect(options.command).toBe(`${resumeCommand} '--fork-session'`)
  })

  it('leaves remote panes, refusals and Dev-created non-Claude resumes alone', async () => {
    const isSessionLive = vi.fn(async () => true)
    const { args, options } = savedResume()
    const codex: ResumeSpawnAdmission = {
      verdict: 'admitted',
      refused: { agent: 'codex', providerSession }
    }
    const refused: ResumeSpawnAdmission = { verdict: 'chat-home', refused: codex.refused }
    const dev = { importedFromProd: false, isSessionLive }

    await expect(forkProdOriginResume(args, options, codex, dev)).resolves.toBe(codex)
    await expect(forkProdOriginResume(args, options, refused, imported)).resolves.toBe(refused)
    const remote = { ...args, connectionId: 'ssh-1' }
    await expect(forkProdOriginResume(remote, options, null, imported)).resolves.toBeNull()
    expect(isSessionLive).not.toHaveBeenCalled()
    expect(options.command).toBe(resumeCommand)
  })
})
