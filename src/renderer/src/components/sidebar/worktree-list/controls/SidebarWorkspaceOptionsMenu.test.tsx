// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import SidebarWorkspaceOptionsMenu from './SidebarWorkspaceOptionsMenu'

describe('SidebarWorkspaceOptionsMenu', () => {
  afterEach(cleanup)

  it('opens the client grouping sheet from the menu while the list is empty', async () => {
    useAppStore.setState({ repos: [], projectGroups: [], clientGroupingSheetOpen: false })
    render(
      <TooltipProvider>
        <SidebarWorkspaceOptionsMenu />
      </TooltipProvider>
    )
    fireEvent.keyDown(screen.getByRole('button', { name: 'Workspace options' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Group by client…' }))
    expect(await screen.findByRole('dialog', { name: 'Group by client' })).toBeTruthy()
    expect(screen.getByText('Nothing to suggest: every project is already grouped.')).toBeTruthy()
  })
})
