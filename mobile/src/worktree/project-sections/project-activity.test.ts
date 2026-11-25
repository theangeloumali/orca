import { describe, expect, it } from 'vitest'
import { buildProjectActivity } from './project-activity'
import type { Worktree } from '../workspace-list/workspace-list-types'
import { worktreeRow } from '../../test-support/worktree-row-fixture'

const STATUS = { working: 'working', waiting: 'permission', idle: 'inactive' } as const
const row = (state: keyof typeof STATUS) => worktreeRow({ status: STATUS[state] })
const isWorking = (r: Worktree) => r.status === 'working'
const needsYou = (r: Worktree) => r.status === 'permission'

describe('buildProjectActivity', () => {
  it("counts each project's working and needs-you workspaces", () => {
    const activity = buildProjectActivity(
      [
        { key: 'repo:a', data: [row('working'), row('working'), row('waiting'), row('idle')] },
        { key: 'repo:b', data: [row('idle')] }
      ],
      isWorking,
      needsYou
    )
    expect(activity.get('repo:a')).toEqual({ working: 2, needsYou: 1 })
  })

  it('leaves quiet projects and group headers without activity', () => {
    const activity = buildProjectActivity(
      [
        { key: 'repo:b', data: [row('idle')] },
        { key: 'group:g', isProjectGroup: true, data: [row('working')] }
      ],
      isWorking,
      needsYou
    )
    expect([...activity.keys()]).toEqual([])
  })
})
