// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { ClientGroupingHint } from './ClientGroupingHint'

function project(id: string, client = 'ZKidz'): Repo {
  return {
    id,
    path: `/Users/me/Work/${client}/${id}`,
    displayName: id,
    badgeColor: '#000',
    addedAt: 0
  }
}

const uiSet = vi.fn(async () => undefined)
const zkidz = [project('orca'), project('aicc'), project('site')]

describe('ClientGroupingHint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(window, { api: { ui: { set: uiSet } } })
    useAppStore.setState({
      projectGroups: [],
      dismissedClientSuggestionsKey: null,
      clientGroupingSheetOpen: false
    })
  })
  afterEach(cleanup)

  it('stays hidden until three ungrouped projects share a client', () => {
    useAppStore.setState({ repos: zkidz.slice(0, 2) })
    const { container } = render(<ClientGroupingHint hostId="local" />)
    expect(container.textContent).toBe('')
  })

  it("counts the machine's suggested projects and opens the sheet", () => {
    useAppStore.setState({ repos: [...zkidz, project('web', 'Acme'), project('app', 'Acme')] })
    render(<ClientGroupingHint hostId="local" />)
    fireEvent.click(screen.getByRole('button', { name: 'Group 5 ungrouped by client…' }))
    expect(useAppStore.getState().clientGroupingSheetOpen).toBe(true)
  })

  it('ignores another machine', () => {
    useAppStore.setState({ repos: zkidz })
    const { container } = render(<ClientGroupingHint hostId="ssh:box" />)
    expect(container.textContent).toBe('')
  })

  it('stays dismissed for the same projects and returns when a new one is suggested', () => {
    useAppStore.setState({ repos: zkidz })
    render(<ClientGroupingHint hostId="local" />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss client grouping suggestion' }))
    expect(screen.queryByRole('button', { name: /ungrouped by client/ })).toBeNull()
    expect(uiSet).toHaveBeenCalledWith({
      dismissedClientSuggestionsKey: expect.stringContaining('orca')
    })
    act(() => useAppStore.setState({ repos: [...zkidz, project('docs')] }))
    expect(screen.getByRole('button', { name: 'Group 4 ungrouped by client…' })).toBeTruthy()
  })
})
