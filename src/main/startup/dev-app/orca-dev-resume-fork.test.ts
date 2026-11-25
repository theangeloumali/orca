import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAgentResumeArgv } from '../../../shared/agent-launch/startup/agent-resume-argv'
import { buildAgentResumeLaunchCommand } from '../../../shared/agent-launch/startup/agent-resume-launch-command'
import {
  SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV,
  SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV
} from '../../../shared/agent-launch/startup/setup-agent-sequencing'
import type { ResumeSpawnAdmission } from '../../ipc/pty/host-env/saved-resume-admission'
import { isClaudeSessionLive, listOrcaDevClaudeHomes } from './orca-dev-claude-liveness'
import { forkResumeLiveInProd } from './orca-dev-resume-fork'

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

const resumeCommand = buildAgentResumeLaunchCommand(
  'claude',
  'claude',
  getAgentResumeArgv('claude', providerSession) ?? [],
  'posix'
)

function savedResume(command = resumeCommand) {
  const admission: ResumeSpawnAdmission = {
    verdict: 'admitted',
    refused: { agent: 'claude', providerSession }
  }
  const args = { command, launchAgent: 'claude' as const, resumeProviderSession: providerSession }
  const options: { command?: string; env?: Record<string, string> } = { command, env: {} }
  return { admission, args, options }
}

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

describe('forkResumeLiveInProd', () => {
  it('forks a session prod is running and leaves its files unchanged', async () => {
    const home = claudeHome(process.pid)
    const before = hashTree(home)
    const { admission, args, options } = savedResume()
    options.env = { [SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]: resumeCommand }
    const isLive = (sessionId: string) => isClaudeSessionLive(sessionId, [home])

    const next = await forkResumeLiveInProd(args, options, admission, isLive)

    expect(next).toEqual(admission)
    expect(options.command).toBe(`${resumeCommand} --fork-session`)
    expect(options.env[SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]).toBe(
      `${resumeCommand} --fork-session`
    )
    expect(hashTree(home)).toBe(before)
  })

  it('resumes in place when prod is not running the session', async () => {
    const { admission, args, options } = savedResume()

    const next = await forkResumeLiveInProd(args, options, admission, async () => false)

    expect(next).toEqual(admission)
    expect(options.command).toBe(resumeCommand)
  })

  it('refuses a live resume whose command it cannot rewrite exactly', async () => {
    const odd = `claude --resume ${SESSION_ID} --model opus`
    const { admission, args, options } = savedResume(odd)

    const next = await forkResumeLiveInProd(args, options, admission, async () => true)

    expect(next).toEqual({ verdict: 'unverifiable', refused: admission.refused })
    expect(options.command).toBeUndefined()
    expect(args.command).toBeUndefined()
  })

  it('refuses a live resume buried in a sequenced startup script', async () => {
    const { admission, args, options } = savedResume()
    options.env = { [SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV]: `wait; ${resumeCommand}` }

    const next = await forkResumeLiveInProd(args, options, admission, async () => true)

    expect(next?.verdict).toBe('unverifiable')
  })

  it('forks a user-started resume of a live session too', async () => {
    const { args, options } = savedResume()

    const next = await forkResumeLiveInProd(args, options, null, async () => true)

    expect(next).toBeNull()
    expect(options.command).toBe(`${resumeCommand} --fork-session`)
  })

  it('leaves other agents, remote panes and refusals alone without checking liveness', async () => {
    const isLive = vi.fn(async () => true)
    const { args, options } = savedResume()
    const codex: ResumeSpawnAdmission = {
      verdict: 'admitted',
      refused: { agent: 'codex', providerSession }
    }
    const refused: ResumeSpawnAdmission = { verdict: 'chat-home', refused: codex.refused }

    await expect(forkResumeLiveInProd(args, options, codex, isLive)).resolves.toBe(codex)
    await expect(forkResumeLiveInProd(args, options, refused, isLive)).resolves.toBe(refused)
    const remote = { ...args, connectionId: 'ssh-1' }
    await expect(forkResumeLiveInProd(remote, options, null, isLive)).resolves.toBeNull()
    await expect(
      forkResumeLiveInProd({ ...args, launchAgent: 'codex' }, options, null, isLive)
    ).resolves.toBeNull()
    expect(isLive).not.toHaveBeenCalled()
    expect(options.command).toBe(resumeCommand)
  })
})
