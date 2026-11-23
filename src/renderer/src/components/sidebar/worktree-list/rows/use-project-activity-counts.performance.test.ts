// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { useProjectActivityCounts } from './use-project-activity-counts'

const SCOPE = new Map([['local' as const, [worktree.id]]])
const withTitle = (title: string) => ({
  [worktree.id]: [makeTab({ id: 'tab-1', worktreeId: worktree.id, title })]
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

// Guards the project header badge from rescanning every agent on each terminal title write.
it('recounts a project header on a PTY change, never on a terminal title write', () => {
  const tabsByWorktree = withTitle('zsh')
  useAppStore.setState({
    repos: [repo],
    worktreesByRepo: { [repo.id]: [worktree] },
    tabsByWorktree
  })
  // Each recount walks the accepted agent map once; the spy only counts those walks.
  const scans = vi.spyOn(useAppStore.getState().agentStatusByPaneKey, Symbol.iterator)
  const { result } = renderHook(() => useProjectActivityCounts(SCOPE))
  const mounted = scans.mock.calls.length

  for (let write = 0; write < 20; write++) {
    act(() => {
      const tabsByWorktree = withTitle(`vim ${write}`)
      useAppStore.setState({ tabsByWorktree })
    })
  }
  expect(scans.mock.calls.length - mounted).toBe(0)

  act(() => {
    useAppStore.setState({ ptyIdsByTabId: { 'tab-1': ['pty-1'] } })
  })
  expect(scans.mock.calls.length - mounted).toBe(1)
  expect(result.current.terminals).toBe(1)
})
