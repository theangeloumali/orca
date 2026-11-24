import { describe, expect, it } from 'vitest'
import { buildProjectActivity } from './project-activity'
import type { Worktree } from '../workspace-list/workspace-list-types'

const row = (state: 'working' | 'waiting' | 'idle') => ({ state }) as unknown as Worktree
const isWorking = (r: Worktree) => (r as unknown as { state: string }).state === 'working'
const needsYou = (r: Worktree) => (r as unknown as { state: string }).state === 'waiting'

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
