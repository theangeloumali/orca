// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { useFilterScopedCollapse } from './use-filter-scoped-collapse'

const SAVED = new Set(['repo:zkidz-courses', 'pinned'])

function setLive(on: boolean): void {
  act(() => useAppStore.setState({ showOnlyRunningTerminals: on }))
}

describe('useFilterScopedCollapse', () => {
  beforeEach(() => {
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
})
