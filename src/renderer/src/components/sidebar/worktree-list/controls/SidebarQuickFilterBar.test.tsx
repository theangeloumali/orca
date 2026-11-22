// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { repo } from '../grouping/worktree-list-groups-test-fixtures'
import { FindMatchHighlight } from './FindMatchHighlight'
import { SidebarQuickFilterBar } from './SidebarQuickFilterBar'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>
}))

const localRepo = { ...repo, id: 'r-local', connectionId: null }
const remoteRepo = { ...repo, id: 'r-remote', connectionId: 'conn-remote' }

describe('SidebarQuickFilterBar', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('stays hidden on one machine with no filter on', () => {
    useAppStore.setState({ repos: [localRepo] })
    render(<SidebarQuickFilterBar />)
    expect(screen.queryByRole('button', { name: 'Live' })).toBeNull()
  })

  it('turns Live on from its chip once a second machine is listed', () => {
    useAppStore.setState({ repos: [localRepo, remoteRepo] })
    render(<SidebarQuickFilterBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(useAppStore.getState().showOnlyRunningTerminals).toBe(true)
  })

  it('opens find from the search button and clears the query on Escape', () => {
    useAppStore.setState({ repos: [localRepo, remoteRepo] })
    render(<SidebarQuickFilterBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Find in sidebar' }))
    const field = screen.getByRole('searchbox', { name: 'Find workspaces' })
    fireEvent.change(field, { target: { value: 'api' } })
    expect(useAppStore.getState().sidebarFindQuery).toBe('api')
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(useAppStore.getState().sidebarFindQuery).toBe('')
  })
})

describe('FindMatchHighlight', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('marks every match of the find query in a label', () => {
    useAppStore.setState({ sidebarFindQuery: 'API' })
    const { container } = render(<FindMatchHighlight text="api-gateway api" />)
    expect([...container.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual([
      'api',
      'api'
    ])
    expect(container.textContent).toBe('api-gateway api')
  })
})
