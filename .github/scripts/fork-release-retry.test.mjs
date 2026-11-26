import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldRetryRelease } from './fork-release-retry.mjs'

const mac = (conclusion, steps) => ({
  name: 'build (macos-15, pnpm install)',
  conclusion,
  steps
})
const win = (conclusion, steps = [{}]) => ({
  name: 'build (windows-latest, pnpm install)',
  conclusion,
  steps
})

test('retries a macOS build cancelled before any step ran', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'failure', run_attempt: 1 }, [
      mac('cancelled', []),
      win('success')
    ]).retry,
    true
  )
})

test('never retries a macOS build that ran and was cancelled mid-build', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'failure', run_attempt: 1 }, [
      mac('cancelled', [{}]),
      win('success')
    ]).retry,
    false
  )
})

test('never retries when any job ran and failed', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'failure', run_attempt: 1 }, [
      mac('cancelled', []),
      win('failure')
    ]).retry,
    false
  )
})

test('stops after the third attempt', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'failure', run_attempt: 3 }, [mac('cancelled', [])]).retry,
    false
  )
})

test('leaves a successful run alone', () => {
  assert.equal(
    shouldRetryRelease({ conclusion: 'success', run_attempt: 1 }, [mac('success', [{}])]).retry,
    false
  )
})
