// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { GroupColorDialogHost } from './GroupColorDialogHost'
import { ProjectGroupHeaderMenu } from './project-group-header-actions'

const toggleGroup = vi.fn()

beforeEach(() => {
  toggleGroup.mockClear()
  useAppStore.setState({
    settings: getDefaultSettings('/home/test'),
    projectGroups: [],
    updateProjectGroups: async () => true
  })
})
afterEach(cleanup)

function renderHeader(): void {
  render(
    <TooltipProvider>
      <GroupColorDialogHost>
        {/* Stands in for the group header row: its click, key and pointer handlers fold the group. */}
        <div onClick={toggleGroup} onKeyDown={toggleGroup} onPointerDown={toggleGroup}>
          <ProjectGroupHeaderMenu
            groupId="clients"
            shownColor={{ color: '#22c55e', ownerGroupId: 'clients' }}
            label="Clients"
            projectGroup={null}
            collapsedGroups={new Set()}
            onToggleSubtree={() => false}
            onRename={vi.fn()}
            onDelete={vi.fn()}
          />
        </div>
      </GroupColorDialogHost>
    </TooltipProvider>
  )
}

describe('group custom color dialog', () => {
  it('never toggles or collapses the group from Done or Enter inside the dialog', async () => {
    renderHeader()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Group actions for Clients' }), {
      key: 'Enter'
    })
    fireEvent.keyDown(await screen.findByRole('menuitem', { name: 'Color' }), { key: 'ArrowRight' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Custom…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Custom group color' })
    toggleGroup.mockClear()

    fireEvent.keyDown(dialog, { key: 'Enter' })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(toggleGroup).not.toHaveBeenCalled()
  })
})
