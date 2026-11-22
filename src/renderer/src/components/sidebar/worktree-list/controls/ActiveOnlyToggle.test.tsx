// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { SidebarSectionHeader } from '../../SidebarSectionHeader'
import { ActiveOnlyToggle } from './ActiveOnlyToggle'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>
}))

function renderInFoldHeader(onFold: () => void): HTMLElement {
  render(
    <SidebarSectionHeader
      title="Projects"
      sectionId="projects"
      actions={null}
      fold={{ collapsed: false, label: 'Collapse Projects', onToggle: onFold }}
      titleAccessory={<ActiveOnlyToggle />}
    />
  )
  return screen.getByRole('button', { name: 'Active only' })
}

describe('ActiveOnlyToggle', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('sits in a positioned header-action slot above the fold target', () => {
    const toggle = renderInFoldHeader(() => undefined)
    const slot = toggle.closest('[data-sidebar-header-actions]')
    expect(slot?.className.split(' ')).toContain('relative')
  })

  it('turns the filter on without folding the section', () => {
    const onFold = vi.fn()
    fireEvent.click(renderInFoldHeader(onFold))
    expect(useAppStore.getState().showOnlyRunningTerminals).toBe(true)
    expect(onFold).not.toHaveBeenCalled()
  })

  it('offers to show all workspaces while on', () => {
    useAppStore.setState({ showOnlyRunningTerminals: true })
    renderInFoldHeader(() => undefined)
    expect(screen.getByText('Show all workspaces')).toBeTruthy()
  })
})
