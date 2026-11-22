// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { PROJECTS_SECTION_GROUP_KEY } from '../../../../../shared/sidebar-list/sections/group-keys'
import { repo } from '../worktree-list/grouping/worktree-list-groups-test-fixtures'
import SidebarHeader from './SidebarHeader'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>
}))

describe('SidebarHeader find button', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  function renderHeader(): HTMLElement {
    useAppStore.setState({ repos: [repo] })
    render(<SidebarHeader collapsible onWorkspaceBoardMenuOpenChange={() => undefined} />)
    return screen.getByRole('button', { name: 'Find in sidebar' })
  }

  it('sits in a positioned header-action slot above the fold target', () => {
    const slot = renderHeader().closest('[data-sidebar-header-actions]')
    expect(slot?.className.split(' ')).toContain('relative')
  })

  it('opens find without folding the section', () => {
    fireEvent.click(renderHeader())
    expect(screen.getByRole('searchbox', { name: 'Find workspaces' })).toBeTruthy()
    expect(useAppStore.getState().collapsedGroups.has(PROJECTS_SECTION_GROUP_KEY)).toBe(false)
  })
})
