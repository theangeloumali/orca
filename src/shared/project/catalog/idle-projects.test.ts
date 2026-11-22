import { describe, expect, it } from 'vitest'
import {
  IDLE_PROJECT_THRESHOLD_DAYS,
  getIdleDays,
  getProjectLastActiveAt,
  isIdleProject
} from './idle-projects'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = 1_000 * DAY_MS

describe('getProjectLastActiveAt', () => {
  it('takes the newest workspace activity', () => {
    const workspaces = [
      { lastActivityAt: NOW - 40 * DAY_MS, lastVisitedAt: undefined },
      { lastActivityAt: NOW - 5 * DAY_MS, lastVisitedAt: undefined }
    ]
    expect(getProjectLastActiveAt(NOW - 300 * DAY_MS, workspaces)).toBe(NOW - 5 * DAY_MS)
  })

  it('uses addedAt when the project has no workspaces', () => {
    expect(getProjectLastActiveAt(NOW - 45 * DAY_MS, [])).toBe(NOW - 45 * DAY_MS)
  })
})

describe('isIdleProject', () => {
  it('counts a project idle from exactly the threshold', () => {
    expect(isIdleProject(NOW - IDLE_PROJECT_THRESHOLD_DAYS * DAY_MS, NOW)).toBe(true)
    expect(isIdleProject(NOW - IDLE_PROJECT_THRESHOLD_DAYS * DAY_MS + 1, NOW)).toBe(false)
  })
})

describe('getIdleDays', () => {
  it('floors to whole days and never goes negative', () => {
    expect(getIdleDays(NOW - 94 * DAY_MS - 1000, NOW)).toBe(94)
    expect(getIdleDays(NOW + DAY_MS, NOW)).toBe(0)
  })
})
