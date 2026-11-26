import { expect, test } from 'vitest'
import { shouldRetryRelease } from './fork-release-retry.mjs'

const mac = (conclusion, steps) => ({ name: 'build (macos-15, pnpm install)', conclusion, steps })
const win = (conclusion, steps = [{}]) => ({
  name: 'build (windows-latest, pnpm install)',
  conclusion,
  steps
})
const failed = (extra = {}) => ({
  conclusion: 'failure',
  run_attempt: 1,
  newerSuccess: false,
  ...extra
})

test('retries a macOS build cancelled before any step ran', () => {
  expect(shouldRetryRelease(failed(), [mac('cancelled', []), win('success')]).retry).toBe(true)
})

test('never retries a macOS build that ran and was cancelled mid-build', () => {
  expect(shouldRetryRelease(failed(), [mac('cancelled', [{}]), win('success')]).retry).toBe(false)
})

test('never retries when any job ran and failed', () => {
  expect(shouldRetryRelease(failed(), [mac('cancelled', []), win('failure')]).retry).toBe(false)
})

test('retries once: a rerun started by the workflow token starts no further run', () => {
  expect(shouldRetryRelease(failed({ run_attempt: 2 }), [mac('cancelled', [])]).retry).toBe(false)
})

test('leaves a run someone cancelled alone', () => {
  expect(
    shouldRetryRelease(failed({ conclusion: 'cancelled' }), [mac('cancelled', [])]).retry
  ).toBe(false)
})

test('never republishes an older build once a newer release exists', () => {
  expect(shouldRetryRelease(failed({ newerSuccess: true }), [mac('cancelled', [])]).retry).toBe(
    false
  )
})

test('leaves a successful run alone', () => {
  expect(
    shouldRetryRelease({ conclusion: 'success', run_attempt: 1, newerSuccess: false }, [
      mac('success', [{}])
    ]).retry
  ).toBe(false)
})
