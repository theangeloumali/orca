import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store/index'
import { buildVisibleWorktreeOptionsFromState } from './visible-worktree-options-from-state'

afterEach(() => useAppStore.setState({ showOnlyRunningTerminals: false }))

it('buildVisibleWorktreeOptionsFromState carries the Active only flag', () => {
  useAppStore.setState({ showOnlyRunningTerminals: true })
  const options = buildVisibleWorktreeOptionsFromState(useAppStore.getState(), new Map(), new Map())
  expect(options.showOnlyRunningTerminals).toBe(true)
})
