import { test } from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(shouldRetryRelease(failed(), [mac('cancelled', []), win('success')]).retry, true)
})

test('never retries a macOS build that ran and was cancelled mid-build', () => {
  assert.equal(shouldRetryRelease(failed(), [mac('cancelled', [{}]), win('success')]).retry, false)
})

test('never retries when any job ran and failed', () => {
  assert.equal(shouldRetryRelease(failed(), [mac('cancelled', []), win('failure')]).retry, false)
})

test('retries once: a rerun started by the workflow token starts no further run', () => {
  assert.equal(shouldRetryRelease(failed({ run_attempt: 2 }), [mac('cancelled', [])]).retry, false)
})

test('leaves a run someone cancelled alone', () => {
  assert.equal(
    shouldRetryRelease(failed({ conclusion: 'cancelled' }), [mac('cancelled', [])]).retry,
    false
  )
})

test('never republishes an older build once a newer release exists', () => {
  assert.equal(
    shouldRetryRelease(failed({ newerSuccess: true }), [mac('cancelled', [])]).retry,
    false
  )
})

test('leaves a successful run alone', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'success', run_attempt: 1, newerSuccess: false }, [
      mac('success', [{}])
    ]).retry,
    false
  )
})
