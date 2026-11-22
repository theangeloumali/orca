// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { repo, worktree } from '../worktree-list/grouping/worktree-list-groups-test-fixtures'
import type { Repo } from '../../../../../shared/repository/repo-types'
import HiddenProjectsSection from './HiddenProjectsSection'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const DAY_MS = 24 * 60 * 60 * 1000
// Fixed clock so idle ages never depend on when the test runs.
const NOW = Date.UTC(2026, 10, 22, 12)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function project(id: string, extra: Partial<Repo> = {}): Repo {
  return { ...repo, id, displayName: id, addedAt: NOW - 400 * DAY_MS, ...extra }
}

function workspaceFor(repoId: string, idleDays: number): typeof worktree {
  return {
    ...worktree,
    id: `${repoId}::main`,
    repoId,
    lastActivityAt: NOW - idleDays * DAY_MS
  }
}

function setProjects(repos: Repo[], idleDaysByRepo: Record<string, number>): void {
  useAppStore.setState({
    repos,
    worktreesByRepo: Object.fromEntries(
      Object.entries(idleDaysByRepo).map(([repoId, days]) => [repoId, [workspaceFor(repoId, days)]])
    ),
    lastVisitedAtByWorktreeId: {},
    updateRepo: async (repoId, updates) => {
      useAppStore.setState((state) => ({
        repos: state.repos.map((entry) =>
          entry.id === repoId ? { ...entry, hiddenAt: updates.hiddenAt ?? undefined } : entry
        )
      }))
      return true
    }
  })
}

const hiddenIds = (): string[] =>
  useAppStore
    .getState()
    .repos.filter((entry) => typeof entry.hiddenAt === 'number')
    .map((entry) => entry.id)

describe('HiddenProjectsSection', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows one unnamed Archive section when only this computer has archived projects', () => {
    setProjects([project('anno', { hiddenAt: 2 }), project('civ', { hiddenAt: 1 })], { anno: 94 })
    render(<HiddenProjectsSection />)
    const toggle = screen.getByRole('button', { name: 'Archive · 2' })
    fireEvent.click(toggle)
    expect(screen.getByText('94d')).toBeTruthy()
  })

  it('folds archived projects into one section per machine', () => {
    setProjects(
      [project('anno', { hiddenAt: 2 }), project('remote', { connectionId: 'box', hiddenAt: 1 })],
      {}
    )
    render(<HiddenProjectsSection />)
    const toggles = screen.getAllByRole('button', { name: /^Archive · / })
    expect(toggles).toHaveLength(2)
    expect(toggles[0].textContent).toMatch(/· 1$/)
    expect(toggles[1].textContent).toMatch(/· 1$/)
    expect(toggles[0].textContent).not.toBe(toggles[1].textContent)
  })

  it('restores an archived project', async () => {
    setProjects([project('anno', { hiddenAt: 2 })], {})
    render(<HiddenProjectsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Archive · 1' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Restore anno' }))
    })
    expect(hiddenIds()).toEqual([])
  })

  it('offers to archive exactly the projects idle 30+ days', async () => {
    setProjects(
      [project('busy'), project('stale'), project('empty'), project('new', { addedAt: NOW })],
      {
        busy: 2,
        stale: 31
      }
    )
    render(<HiddenProjectsSection />)
    expect(screen.getByText('2 projects idle 30+ days')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archive them' }))
    })
    expect(hiddenIds()).toEqual(['stale', 'empty'])
  })

  it('dismisses the idle suggestion without archiving', () => {
    setProjects([project('stale')], { stale: 40 })
    render(<HiddenProjectsSection />)
    expect(screen.getByText('1 project idle 30+ days')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss idle projects suggestion' }))
    expect(screen.queryByText('1 project idle 30+ days')).toBeNull()
    expect(hiddenIds()).toEqual([])
  })
})
