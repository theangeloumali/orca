import { describe, expect, it } from 'vitest'
import { forkBuildLacksPush } from './fork-push-availability'

describe('forkBuildLacksPush', () => {
  it("is true for a fork build without its own push setup, since Stably's push service can't reach it", () => {
    expect(forkBuildLacksPush({ orcaForkBuild: true, orcaForkPush: false })).toBe(true)
    expect(forkBuildLacksPush({ orcaForkBuild: true })).toBe(true)
  })

  it('is false for a fork build with push and for the official app', () => {
    expect(forkBuildLacksPush({ orcaForkBuild: true, orcaForkPush: true })).toBe(false)
    expect(forkBuildLacksPush({})).toBe(false)
    expect(forkBuildLacksPush(undefined)).toBe(false)
  })
})
