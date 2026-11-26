// Fork-only: decides whether a finished "Fork sync and release" run should be rerun.
// GitHub sometimes never assigns a macOS runner; the job is cancelled with no steps run.
// Only that case is retried, at most twice; a build that ran and failed is never retried.
import { pathToFileURL } from 'node:url'

export const MAX_ATTEMPTS = 3

const stepCount = (job) => (job.steps ?? []).length

/** @param {{ conclusion: string, run_attempt: number }} run @param {Array<{ name: string, conclusion: string | null, steps?: unknown[] }>} jobs */
export function shouldRetryRelease(run, jobs) {
  if (!['failure', 'cancelled'].includes(run.conclusion)) {
    return { retry: false, reason: 'run did not fail' }
  }
  if (run.run_attempt >= MAX_ATTEMPTS) {
    return { retry: false, reason: 'attempts exhausted' }
  }
  if (jobs.some((job) => job.conclusion === 'failure' && stepCount(job) > 0)) {
    return { retry: false, reason: 'a job ran and failed' }
  }
  const macNoRunner = jobs.some(
    (job) =>
      job.name.startsWith('build (macos') && job.conclusion === 'cancelled' && stepCount(job) === 0
  )
  return macNoRunner
    ? { retry: true, reason: 'macOS build never got a runner' }
    : { retry: false, reason: 'no runner-less macOS cancellation' }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const input = JSON.parse(await new Response(process.stdin).text())
  console.log(JSON.stringify(shouldRetryRelease(input.run, input.jobs)))
}
