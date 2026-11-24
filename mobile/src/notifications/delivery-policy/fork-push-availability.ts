import * as z from 'zod'

// Only a fork build sets orcaForkBuild; ORCA_FORK_PUSH=1 adds orcaForkPush (scripts/fork-app-identity.cjs).
const forkBuildExtraSchema = z.looseObject({
  orcaForkBuild: z.literal(true),
  orcaForkPush: z.boolean().optional()
})

/** A fork build without its own push keys: Stably's push service delivers only to the official app ids. */
export function forkBuildLacksPush(extra: unknown): boolean {
  const fork = forkBuildExtraSchema.safeParse(extra)
  return fork.success && fork.data.orcaForkPush !== true
}
