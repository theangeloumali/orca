import { describe, expect, it, vi } from 'vitest'
import { summarizeActiveOnly } from './active-only-project-summary'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'

const busy = makeWorktree({ id: 'busy-1', repoId: 'busy' })
const idle = makeWorktree({ id: 'idle-1', repoId: 'idle' })
const waiting = makeWorktree({ id: 'waiting-1', repoId: 'waiting' })
const sectionOf = (worktree: { repoId: string }) => `repo:${worktree.repoId}`

describe('summarizeActiveOnly', () => {
  it('counts shown and listed project sections and workspaces', () => {
    const summary = summarizeActiveOnly({
      shown: [busy],
      all: [busy, idle, waiting],
      sectionKeyOf: sectionOf,
      needsYouIds: () => new Set()
    })
    expect(summary).toEqual({
      shownProjects: 1,
      totalProjects: 3,
      shownWorkspaces: 1,
      totalWorkspaces: 3,
      hiddenNeedsYouCount: 0
    })
  })

  it('counts a section once when several repos share it', () => {
    const summary = summarizeActiveOnly({
      shown: [busy, idle],
      all: [busy, idle],
      sectionKeyOf: () => 'project:shared',
      needsYouIds: () => new Set()
    })
    expect(summary.shownProjects).toBe(1)
    expect(summary.totalProjects).toBe(1)
  })

  it('asks about and counts only the workspaces Active only hides', () => {
    const needsYouIds = vi.fn(() => new Set(['waiting-1', 'busy-1']))
    const summary = summarizeActiveOnly({
      shown: [busy],
      all: [busy, idle, waiting],
      sectionKeyOf: sectionOf,
      needsYouIds
    })
    expect(needsYouIds).toHaveBeenCalledWith([idle, waiting])
    expect(summary.hiddenNeedsYouCount).toBe(1)
  })

  it('skips the attention pass when nothing is hidden', () => {
    const needsYouIds = vi.fn(() => new Set<string>())
    summarizeActiveOnly({ shown: [busy], all: [busy], sectionKeyOf: sectionOf, needsYouIds })
    expect(needsYouIds).not.toHaveBeenCalled()
  })
})
