// Fork-only: decides whether a failed "Fork sync and release" run should be rerun once.
import { pathToFileURL } from 'node:url'

// A rerun started with the workflow token emits no event, so only the first attempt can retry.
export const MAX_ATTEMPTS = 2

const stepCount = (job) => (job.steps ?? []).length

/**
 * Retries only a failed run whose macOS build was cancelled before any step (no runner).
 * newerSuccess: a release was published after this run began, so a rerun would make an older build "latest".
 * @param {{ conclusion: string, run_attempt: number, newerSuccess: boolean }} run
 * @param {Array<{ name: string, conclusion: string | null, steps?: unknown[] }>} jobs
 */
export function shouldRetryRelease(run, jobs) {
  if (run.conclusion !== 'failure') {
    return { retry: false, reason: 'run did not fail' }
  }
  if (run.run_attempt >= MAX_ATTEMPTS) {
    return { retry: false, reason: 'already retried' }
  }
  if (run.newerSuccess) {
    return { retry: false, reason: 'a newer release is already published' }
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
