// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
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

  it('puts the find button in the header slot while the chip row is hidden', () => {
    useAppStore.setState({ repos: [localRepo] })
    const slot = document.createElement('div')
    document.body.append(slot)
    render(<SidebarQuickFilterBar findButtonTarget={slot} />)
    const button = screen.getByRole('button', { name: 'Find in sidebar' })
    expect(slot.contains(button)).toBe(true)
    fireEvent.click(button)
    expect(screen.getByRole('searchbox', { name: 'Find workspaces' })).toBeTruthy()
    slot.remove()
  })

  it('opens find on Mod+F only while focus is inside the sidebar', () => {
    useAppStore.setState({ repos: [localRepo] })
    const sidebar = document.createElement('div')
    sidebar.setAttribute('data-worktree-sidebar', '')
    const outside = document.createElement('div')
    document.body.append(sidebar, outside)
    render(<SidebarQuickFilterBar />)
    const isMac = navigator.userAgent.includes('Mac')
    const chord = { key: 'f', code: 'KeyF', ctrlKey: !isMac, metaKey: isMac }
    fireEvent.keyDown(outside, chord)
    expect(screen.queryByRole('searchbox', { name: 'Find workspaces' })).toBeNull()
    fireEvent.keyDown(sidebar, chord)
    expect(screen.getByRole('searchbox', { name: 'Find workspaces' })).toBeTruthy()
    sidebar.remove()
    outside.remove()
  })

  it('keeps a selected client matching a project added to it later', () => {
    const acme: ProjectGroup = {
      id: 'acme',
      name: 'Acme',
      parentPath: null,
      parentGroupId: null,
      createdFrom: 'manual',
      tabOrder: 0,
      isCollapsed: false,
      color: null,
      createdAt: 0,
      updatedAt: 0
    }
    const inAcme = { ...localRepo, projectGroupId: 'acme' }
    useAppStore.setState({
      projectGroups: [acme],
      repos: [inAcme, remoteRepo],
      filterRepoIds: ['r-local']
    })
    render(<SidebarQuickFilterBar />)
    const joined = { ...remoteRepo, id: 'r-new', projectGroupId: 'acme' }
    useAppStore.setState({ repos: [inAcme, remoteRepo, joined] })
    expect(useAppStore.getState().filterRepoIds).toEqual(['r-local', 'r-new'])
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
