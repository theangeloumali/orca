import { getAgentResumeArgv } from './agent-resume-argv'
import type {
  AgentProviderSessionMetadata,
  ResumableTuiAgent
} from '../../agent-session/lifecycle/agent-session-resume'
import { quoteStartupArg, type AgentStartupShell } from './tui-agent-startup-shell'

/** Unrecognized locators require refusal: the caller cannot safely launch a resume it could not cancel. Dropped returns the plain launch command. */
export type AgentResumeArgvDrop =
  | { status: 'dropped'; command: string }
  | { status: 'absent' }
  | { status: 'unrecognized' }

type AgentResumeArgvMatch =
  | { status: 'matched'; base: string; shell: AgentStartupShell | null }
  | { status: 'absent' }
  | { status: 'unrecognized' }

type AgentResumeCommand = {
  command: string
  agent: ResumableTuiAgent
  providerSession: AgentProviderSessionMetadata
}

const RESUME_ARGV_SHELLS: readonly AgentStartupShell[] = ['posix', 'powershell', 'cmd']

/** Raw join first (shell null), then each shell's quoting. */
function resumeArgvSuffixCandidates(
  resumeArgs: readonly string[]
): { suffix: string; shell: AgentStartupShell | null }[] {
  return [
    { suffix: resumeArgs.join(' '), shell: null },
    ...RESUME_ARGV_SHELLS.map((shell) => ({
      suffix: resumeArgs.map((arg) => quoteStartupArg(arg, shell)).join(' '),
      shell
    }))
  ]
}

function stripSuffix(command: string, suffix: string): string | null {
  const base = command.slice(0, command.length - suffix.length)
  // Why: require a whitespace boundary so `codex resume-foo` can't match `resume`.
  if (!command.endsWith(suffix) || !/\s$/.test(base)) {
    return null
  }
  const trimmed = base.trimEnd()
  return trimmed.length > 0 ? trimmed : null
}

function matchAgentResumeArgv(args: AgentResumeCommand): AgentResumeArgvMatch {
  const argv = getAgentResumeArgv(args.agent, args.providerSession)
  const resumeArgs = argv?.slice(1) ?? []
  const locator = resumeArgs.at(-1)
  const command = args.command.trimEnd()
  if (!locator || !command.includes(locator)) {
    return { status: 'absent' }
  }
  for (const { suffix, shell } of resumeArgvSuffixCandidates(resumeArgs)) {
    const base = stripSuffix(command, suffix)
    if (base !== null && !base.includes(locator)) {
      return { status: 'matched', base, shell }
    }
  }
  return { status: 'unrecognized' }
}

/** Strip appended resume argv when account ownership is unverifiable so launch starts fresh. Trailing-only: Claude selectors before -- remain unrecognized and must be refused. */
export function dropAgentResumeArgvFromCommand(args: AgentResumeCommand): AgentResumeArgvDrop {
  const match = matchAgentResumeArgv(args)
  return match.status === 'matched' ? { status: 'dropped', command: match.base } : match
}

/** Same trailing match, with `replacementArgs` quoted the way the matched resume argv was. */
export function replaceAgentResumeArgvInCommand(
  args: AgentResumeCommand & { replacementArgs: readonly string[] }
): AgentResumeArgvDrop {
  const match = matchAgentResumeArgv(args)
  if (match.status !== 'matched') {
    return match
  }
  const { shell } = match
  const replacement = args.replacementArgs.map((arg) => (shell ? quoteStartupArg(arg, shell) : arg))
  return { status: 'dropped', command: `${match.base} ${replacement.join(' ')}` }
}
