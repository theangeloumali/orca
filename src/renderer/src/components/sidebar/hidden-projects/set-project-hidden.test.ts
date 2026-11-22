import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { repo } from '../worktree-list/grouping/worktree-list-groups-test-fixtures'
import type { Repo } from '../../../../../shared/repository/repo-types'
import { setProjectHidden } from './set-project-hidden'

const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast: toasts }))

function project(id: string, extra: Partial<Repo> = {}): Repo {
  return { ...repo, id, displayName: id, ...extra }
}

function hiddenAtOf(id: string): number | undefined {
  return useAppStore.getState().repos.find((entry) => entry.id === id)?.hiddenAt
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({
    repos: [project('anno'), project('civ', { hiddenAt: 7 })],
    updateRepo: async (repoId, updates) => {
      useAppStore.setState((state) => ({
        repos: state.repos.map((entry) =>
          entry.id === repoId ? { ...entry, hiddenAt: updates.hiddenAt ?? undefined } : entry
        )
      }))
      return true
    }
  })
})

describe('setProjectHidden', () => {
  it('archives with an "Archived <name>" toast whose Undo restores it', async () => {
    await setProjectHidden([project('anno')], true, 'Anno')
    expect(typeof hiddenAtOf('anno')).toBe('number')
    const [title, options] = toasts.success.mock.calls[0]
    expect(title).toBe('Archived Anno')
    expect(options.action.label).toBe('Undo')
    await options.action.onClick()
    expect(hiddenAtOf('anno')).toBeUndefined()
  })

  it('restores an archived project without a toast', async () => {
    expect(await setProjectHidden([project('civ', { hiddenAt: 7 })], false, 'civ')).toBe(true)
    expect(hiddenAtOf('civ')).toBeUndefined()
    expect(toasts.success).not.toHaveBeenCalled()
  })
})
