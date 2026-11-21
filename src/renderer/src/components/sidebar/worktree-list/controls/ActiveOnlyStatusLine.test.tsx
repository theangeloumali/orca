// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { ActiveOnlyStatusLine } from './ActiveOnlyStatusLine'

const otherRepo = { ...repo, id: 'repo-2', displayName: 'other' }
const running = { ...worktree, id: 'wt-running' }
const idleSibling = { ...worktree, id: 'wt-idle' }
const idleElsewhere = { ...worktree, id: 'wt-other', repoId: otherRepo.id }

describe('ActiveOnlyStatusLine', () => {
  beforeEach(() => {
    useAppStore.setState({
      repos: [repo, otherRepo],
      worktreesByRepo: { [repo.id]: [running, idleSibling], [otherRepo.id]: [idleElsewhere] },
      tabsByWorktree: { [running.id]: [makeTab({ id: 'tab-1', worktreeId: running.id })] },
      ptyIdsByTabId: { 'tab-1': ['pty-1'] },
      showSleepingWorkspaces: true,
      showOnlyRunningTerminals: true
    })
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('counts project sections from the real list when grouped by project', () => {
    useAppStore.setState({ groupBy: 'repo' })
    render(<ActiveOnlyStatusLine />)
    expect(screen.getByText('Showing 1 of 2 projects')).toBeTruthy()
  })

  it('counts workspaces when the list is not grouped by project', () => {
    useAppStore.setState({ groupBy: 'none' })
    render(<ActiveOnlyStatusLine />)
    expect(screen.getByText('Showing 1 of 3 workspaces')).toBeTruthy()
  })

  it('is not a live region', () => {
    render(<ActiveOnlyStatusLine />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('offers Show all as a muted inline link that turns the filter off', () => {
    render(<ActiveOnlyStatusLine />)
    const showAll = screen.getByRole('button', { name: 'Show all' })
    expect(showAll.dataset.variant).toBe('link-muted')
    expect(showAll.dataset.size).toBe('inlineText')
    expect(showAll.closest('[data-sidebar-header-actions]')).not.toBeNull()
    fireEvent.click(showAll)
    expect(useAppStore.getState().showOnlyRunningTerminals).toBe(false)
  })
})
