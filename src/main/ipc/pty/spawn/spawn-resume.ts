import type { PtySpawnOperationState, PtySpawnExecutionFacts } from './spawn-operation-state'
import {
  captureSavedResumeCleanup,
  chooseSavedResumeFreshLaunch,
  resumeSpawnRefusal,
  type ResumeSpawnAdmission,
  type ResumeSpawnRefusal
} from '../host-env/saved-resume-admission'
import { IS_ORCA_DEV_APP } from '../../../../shared/fork/orca-dev-app-flag'
import { isClaudeSessionLiveOnThisMac } from '../../../startup/dev-app/orca-dev-claude-liveness'
import { forkProdOriginResume } from '../../../startup/dev-app/orca-dev-resume-fork'

/** Capture the acquired pane's source once; only the physical-fresh branch judges its launch. */
export async function prepareSavedPtyResume(
  ctx: PtySpawnOperationState,
  facts: PtySpawnExecutionFacts
) {
  const args = ctx.args
  args.launchConfig = facts.launchConfig
  const captured: ResumeSpawnAdmission | null =
    args.resumeOrigin === 'saved' && args.launchAgent && args.resumeProviderSession
      ? {
          verdict: 'admitted',
          refused: { agent: args.launchAgent, providerSession: args.resumeProviderSession }
        }
      : null
  await captureSavedResumeCleanup(
    ctx.deps.runtime,
    ctx.deps.store,
    facts.savedResumePaneKey ?? null,
    captured,
    args.worktreeId
  )
  return async (inherited?: ResumeSpawnRefusal): Promise<void> => {
    ctx.spawnOptions.env = { ...ctx.spawnOptions.env }
    ctx.resumeAdmission =
      inherited ??
      (await chooseSavedResumeFreshLaunch(
        ctx.deps.runtime,
        args,
        ctx.expectedWslDistro,
        ctx.spawnOptions
      ))
    if (captured && ctx.resumeAdmission) {
      ctx.resumeAdmission = {
        ...ctx.resumeAdmission,
        refused: captured.refused,
        sourceRecord: captured.sourceRecord
      }
    }
    await forkOrcaDevProdOriginResume(ctx, captured?.sourceRecord?.importedFromProd === true)
    if (resumeSpawnRefusal(ctx.resumeAdmission)) {
      facts.suppressRefusedLaunch?.()
    }
  }
}

type OrcaDevResumeForkState = Pick<
  PtySpawnOperationState,
  'args' | 'spawnOptions' | 'expectedWslDistro' | 'resumeAdmission'
>

/** Orca Dev resumes a conversation prod owns as a fork, never as a second writer. */
export async function forkOrcaDevProdOriginResume(
  state: OrcaDevResumeForkState,
  importedFromProd: boolean
): Promise<void> {
  if (IS_ORCA_DEV_APP && state.expectedWslDistro === null) {
    state.resumeAdmission = await forkProdOriginResume(
      state.args,
      state.spawnOptions,
      state.resumeAdmission,
      { importedFromProd, isSessionLive: isClaudeSessionLiveOnThisMac }
    )
  }
}
