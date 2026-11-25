import { getAgentForkArgv } from '../../../shared/agent-launch/startup/agent-resume-argv'
import { dropAgentResumeArgvFromCommand } from '../../../shared/agent-launch/startup/agent-resume-argv-drop'
import {
  SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV,
  SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV
} from '../../../shared/agent-launch/startup/setup-agent-sequencing'
import type { AgentProviderSessionMetadata } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import {
  suppressSavedResumeLaunch,
  type ResumeSpawnAdmission,
  type ResumeSpawnArgs
} from '../../ipc/pty/host-env/saved-resume-admission'

type ResumeSpawnOptions = Parameters<typeof suppressSavedResumeLaunch>[1]

/** Dev never writes a conversation a running Claude owns: a live one resumes as a fork with a new id.
 *  A live resume whose command cannot be rewritten exactly starts a plain shell instead. */
export async function forkResumeLiveInProd(
  args: ResumeSpawnArgs,
  options: ResumeSpawnOptions,
  admission: ResumeSpawnAdmission | null,
  isSessionLive: (sessionId: string) => Promise<boolean>
): Promise<ResumeSpawnAdmission | null> {
  const providerSession = claudeResumeSession(args, admission)
  const forkArgv = providerSession ? getAgentForkArgv('claude', providerSession) : null
  if (!providerSession || !forkArgv || !(await isSessionLive(providerSession.id))) {
    return admission
  }
  const forkFlags = forkArgv.slice(forkArgv.indexOf(providerSession.id) + 1).join(' ')
  const env = options.env ?? {}
  const sequenced = env[SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]
  const command = options.command && withForkFlags(options.command, providerSession, forkFlags)
  const sequencedCommand = sequenced && withForkFlags(sequenced, providerSession, forkFlags)
  if (
    command === null ||
    sequencedCommand === null ||
    env[SETUP_AGENT_SEQUENCE_STARTUP_SCRIPT_ENV]?.includes(providerSession.id)
  ) {
    suppressSavedResumeLaunch(args, options)
    return { verdict: 'unverifiable', refused: { agent: 'claude', providerSession } }
  }
  if (command) {
    options.command = command
  }
  if (sequencedCommand) {
    options.env = { ...env, [SETUP_AGENT_SEQUENCE_STARTUP_COMMAND_ENV]: sequencedCommand }
  }
  return admission
}

/** Local Claude resumes only; a judged refusal already launches no agent. */
function claudeResumeSession(
  args: ResumeSpawnArgs,
  admission: ResumeSpawnAdmission | null
): AgentProviderSessionMetadata | null {
  if (admission) {
    return admission.verdict === 'admitted' && admission.refused.agent === 'claude'
      ? admission.refused.providerSession
      : null
  }
  return !args.connectionId && args.launchAgent === 'claude' && args.resumeProviderSession
    ? args.resumeProviderSession
    : null
}

/** Same trailing-suffix match as the resume-argv drop; null when the locator sits elsewhere. */
function withForkFlags(
  command: string,
  providerSession: AgentProviderSessionMetadata,
  forkFlags: string
): string | null {
  const drop = dropAgentResumeArgvFromCommand({ command, agent: 'claude', providerSession })
  if (drop.status === 'absent') {
    return command
  }
  return drop.status === 'dropped' ? `${command.trimEnd()} ${forkFlags}` : null
}
