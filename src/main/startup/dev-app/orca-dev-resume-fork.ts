import { getAgentForkArgv } from '../../../shared/agent-launch/startup/agent-resume-argv'
import { replaceAgentResumeArgvInCommand } from '../../../shared/agent-launch/startup/agent-resume-argv-drop'
import {
  SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV,
  SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV
} from '../../../shared/agent-launch/startup/setup-agent-sequencing'
import {
  isResumableTuiAgent,
  type AgentProviderSessionMetadata,
  type ResumableTuiAgent
} from '../../../shared/agent-session/lifecycle/agent-session-resume'
import {
  suppressSavedResumeLaunch,
  type ResumeSpawnAdmission,
  type ResumeSpawnArgs
} from '../../ipc/pty/host-env/saved-resume-admission'

type ResumeSpawnOptions = Parameters<typeof suppressSavedResumeLaunch>[1]

type LocalResume = { agent: ResumableTuiAgent; providerSession: AgentProviderSessionMetadata }

export type ResumeOrigin = {
  /** The pane's saved record came from prod's sync, so prod owns the conversation. */
  importedFromProd: boolean
  /** Hint for resumes with no saved record: a Claude conversation another process is running. */
  isSessionLive: (sessionId: string) => Promise<boolean>
}

/** Dev never writes a conversation prod owns: it resumes as a fork with a new id. A resume it
 *  cannot rewrite exactly, or an agent with no fork command, starts a plain shell instead. */
export async function forkProdOriginResume(
  args: ResumeSpawnArgs,
  options: ResumeSpawnOptions,
  admission: ResumeSpawnAdmission | null,
  origin: ResumeOrigin
): Promise<ResumeSpawnAdmission | null> {
  const resume = localResume(args, admission)
  if (!resume || !(await ownedByProd(resume, origin))) {
    return admission
  }
  const forked = forkCommands(resume, options)
  if (!forked) {
    suppressSavedResumeLaunch(args, options)
    return { verdict: 'unverifiable', refused: resume }
  }
  if (forked.command) {
    options.command = forked.command
  }
  if (forked.sequenced) {
    options.env = { ...options.env, [SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]: forked.sequenced }
  }
  // Why: the fork reports its new id through hooks; publishing prod's would resume prod's on reopen.
  delete args.resumeProviderSession
  delete options.resumeProviderSession
  return admission
}

async function ownedByProd(resume: LocalResume, origin: ResumeOrigin): Promise<boolean> {
  return (
    origin.importedFromProd ||
    (resume.agent === 'claude' && (await origin.isSessionLive(resume.providerSession.id)))
  )
}

/** Local resumes only; a judged refusal already launches no agent. */
function localResume(
  args: ResumeSpawnArgs,
  admission: ResumeSpawnAdmission | null
): LocalResume | null {
  if (args.connectionId) {
    return null
  }
  if (admission) {
    const { agent, providerSession } = admission.refused
    return admission.verdict === 'admitted' && isResumableTuiAgent(agent)
      ? { agent, providerSession }
      : null
  }
  return isResumableTuiAgent(args.launchAgent) && args.resumeProviderSession
    ? { agent: args.launchAgent, providerSession: args.resumeProviderSession }
    : null
}

/** Both startup commands with the resume argv swapped for the fork's; null unless one is rewritten
 *  and neither holds a locator it cannot rewrite (D7: an unrewritten resume would write prod's). */
function forkCommands(
  resume: LocalResume,
  options: ResumeSpawnOptions
): { command?: string; sequenced?: string } | null {
  const forkArgs = forkReplacementArgs(resume)
  const env = options.env ?? {}
  const locators = [resume.providerSession.id, resume.providerSession.transcriptPath]
  const script = env[SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV]
  if (!forkArgs || locators.some((locator) => locator && script?.includes(locator))) {
    return null
  }
  const rewrite = (command: string | undefined) =>
    command
      ? replaceAgentResumeArgvInCommand({ command, ...resume, replacementArgs: forkArgs })
      : null
  const command = rewrite(options.command)
  const sequenced = rewrite(env[SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV])
  const rewrites = [command, sequenced]
  if (
    rewrites.some((rewritten) => rewritten?.status === 'unrecognized') ||
    !rewrites.some((rewritten) => rewritten?.status === 'dropped')
  ) {
    return null
  }
  return {
    ...(command?.status === 'dropped' ? { command: command.command } : {}),
    ...(sequenced?.status === 'dropped' ? { sequenced: sequenced.command } : {})
  }
}

/** The fork argv after the executable; Claude keeps the effort its resume argv carried. */
function forkReplacementArgs({ agent, providerSession }: LocalResume): string[] | null {
  const forkArgs = getAgentForkArgv(agent, providerSession)?.slice(1)
  if (!forkArgs) {
    return null
  }
  return agent === 'claude' && providerSession.effort
    ? ['--effort', providerSession.effort, ...forkArgs]
    : forkArgs
}
