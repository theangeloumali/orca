// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { repo } from '../grouping/worktree-list-groups-test-fixtures'
import { getVisibleProjectGroupSubtreeKeys } from '../rows/use-project-group-subtree-collapse'
import { useFilterScopedCollapse } from './use-filter-scoped-collapse'

const SAVED = new Set(['repo:zkidz-courses', 'pinned'])

function setLive(on: boolean): void {
  act(() => useAppStore.setState({ showOnlyRunningTerminals: on }))
}

describe('useFilterScopedCollapse', () => {
  beforeEach(() => {
    Object.assign(window, { api: { ui: { set: vi.fn().mockResolvedValue(undefined) } } })
    useAppStore.setState({ collapsedGroups: SAVED, showOnlyRunningTerminals: false })
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('opens a collapsed project under Live and restores its collapse when Live is off', () => {
    const { result } = renderHook(() => useFilterScopedCollapse())
    setLive(true)
    expect([...result.current.collapsedGroups]).toEqual(['pinned'])
    setLive(false)
    expect(result.current.collapsedGroups).toEqual(SAVED)
  })

  it('folds a project only for the filter session, leaving the saved layout alone', () => {
    const { result } = renderHook(() => useFilterScopedCollapse())
    setLive(true)
    act(() => result.current.toggleGroup('repo:claudewatch'))
    expect(result.current.collapsedGroups.has('repo:claudewatch')).toBe(true)
    expect(useAppStore.getState().collapsedGroups).toEqual(SAVED)
    setLive(false)
    setLive(true)
    expect(result.current.collapsedGroups.has('repo:claudewatch')).toBe(false)
  })

  it('collapses every project for the session when collapse-all runs while filtering', () => {
    const { result } = renderHook(() => useFilterScopedCollapse())
    setLive(true)
    act(() => result.current.setCollapsedGroups(new Set(['repo:a', 'repo:b', 'pinned'])))
    expect(result.current.collapsedGroups).toEqual(new Set(['pinned', 'repo:a', 'repo:b']))
    expect(useAppStore.getState().collapsedGroups).toEqual(SAVED)
  })

  it('keeps machine and Pinned folds from a filtered collapse-all in the saved layout', () => {
    const { result } = renderHook(() => useFilterScopedCollapse())
    setLive(true)
    act(() => result.current.setCollapsedGroups(new Set(['repo:a', 'host:m1'])))
    expect(useAppStore.getState().collapsedGroups).toEqual(
      new Set(['repo:zkidz-courses', 'host:m1'])
    )
    expect(result.current.collapsedGroups).toEqual(new Set(['host:m1', 'repo:a']))
  })

  it('folds a group subtree on Alt-click under Live without touching the saved layout', () => {
    const work: ProjectGroup = {
      id: 'work',
      name: 'work',
      parentPath: null,
      parentGroupId: null,
      createdFrom: 'manual',
      tabOrder: 0,
      isCollapsed: false,
      color: null,
      createdAt: 0,
      updatedAt: 0
    }
    useAppStore.setState({ projectGroups: [work], repos: [{ ...repo, projectGroupId: 'work' }] })
    const subtreeKeys = getVisibleProjectGroupSubtreeKeys(useAppStore.getState(), 'work')
    const { result } = renderHook(() => useFilterScopedCollapse())
    setLive(true)
    act(() => {
      expect(result.current.toggleProjectGroupSubtree('work')).toBe(true)
    })
    expect(subtreeKeys.length).toBeGreaterThan(0)
    expect(subtreeKeys.every((key) => result.current.collapsedGroups.has(key))).toBe(true)
    expect(useAppStore.getState().collapsedGroups).toEqual(SAVED)
  })
})
