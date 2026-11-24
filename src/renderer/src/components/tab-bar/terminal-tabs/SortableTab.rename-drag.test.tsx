// @vitest-environment happy-dom
import { DndContext, useDndContext, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TabDragPointerSensor } from '../../tab-group/drag/tab-drag-pointer-sensor'
import { TabStripTooltipProvider } from '../strip/TabStripTooltipProvider'
import SortableTab from './SortableTab'

const noop = (): void => {}
const sensorOptions = { activationConstraint: { distance: 5 } }

function ActiveDrag(): React.JSX.Element {
  const { active } = useDndContext()
  return <output data-testid="active-drag">{active ? String(active.id) : 'idle'}</output>
}

function Strip({ title }: { title: string }): React.JSX.Element {
  const sensors = useSensors(useSensor(TabDragPointerSensor, sensorOptions))
  return (
    <DndContext sensors={sensors}>
      <SortableContext items={['tab-1']}>
        <TabStripTooltipProvider>
          <SortableTab
            tab={{ id: 'tab-1', worktreeId: 'wt', title, customTitle: null, color: null }}
            agent={null}
            unifiedTabId="tab-1"
            groupId="group"
            tabCount={2}
            hasTabsToRight
            hasTabsToLeft={false}
            isActive
            isPinned={false}
            isExpanded={false}
            onActivate={noop}
            onClose={noop}
            onCloseOthers={noop}
            onCloseToRight={noop}
            onCloseToLeft={noop}
            onSetCustomTitle={noop}
            onSetTabColor={noop}
            onTogglePin={noop}
            onToggleExpand={noop}
            dragData={{
              kind: 'tab',
              worktreeId: 'wt',
              groupId: 'group',
              unifiedTabId: 'tab-1',
              visibleTabId: 'tab-1',
              tabType: 'terminal',
              label: title,
              color: null
            }}
          />
        </TabStripTooltipProvider>
      </SortableContext>
      <ActiveDrag />
    </DndContext>
  )
}

function tabRoot(): HTMLElement {
  return screen.getByTestId('sortable-tab')
}

function pressAndMoveTab(): string {
  fireEvent.pointerDown(tabRoot(), {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    clientX: 10,
    clientY: 10
  })
  fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: 40, clientY: 10 })
  fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: 60, clientY: 10 })
  const active = screen.getByTestId('active-drag').textContent ?? ''
  fireEvent.pointerUp(document, { pointerId: 1, clientX: 60, clientY: 10 })
  return active
}

async function renameWith(
  open: () => void | Promise<void>,
  finish: (input: HTMLInputElement) => void
): Promise<void> {
  await act(async () => {
    await open()
  })
  const input = screen.getByRole<HTMLInputElement>('textbox')
  await act(async () => {
    fireEvent.change(input, { target: { value: 'Renamed' } })
    finish(input)
  })
  expect(screen.queryByRole('textbox')).toBeNull()
}

describe('SortableTab drag after rename', () => {
  afterEach(cleanup)

  it('drags before any rename', () => {
    render(<Strip title="Terminal" />)
    expect(pressAndMoveTab()).toBe('tab-1')
  })

  it('still drags after a double-click rename committed with Enter', async () => {
    render(<Strip title="Terminal" />)
    await renameWith(
      () => {
        fireEvent.doubleClick(tabRoot())
      },
      (input) => fireEvent.keyDown(input, { key: 'Enter' })
    )
    expect(pressAndMoveTab()).toBe('tab-1')
  })

  it('still drags after a double-click rename committed by blur', async () => {
    render(<Strip title="Terminal" />)
    await renameWith(
      () => {
        fireEvent.doubleClick(tabRoot())
      },
      (input) => fireEvent.blur(input)
    )
    expect(pressAndMoveTab()).toBe('tab-1')
  })

  it('still drags after a double-click rename cancelled with Escape', async () => {
    render(<Strip title="Terminal" />)
    await renameWith(
      () => {
        fireEvent.doubleClick(tabRoot())
      },
      (input) => fireEvent.keyDown(input, { key: 'Escape' })
    )
    expect(pressAndMoveTab()).toBe('tab-1')
  })

  it('still drags after a context-menu rename', async () => {
    render(<Strip title="Terminal" />)
    fireEvent.contextMenu(tabRoot(), { clientX: 10, clientY: 10 })
    const item = await screen.findByRole('menuitem', { name: /change title/i })
    await act(async () => {
      fireEvent.click(item)
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    const input = screen.queryByRole('textbox')
    if (input) {
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' })
      })
    }
    expect(pressAndMoveTab()).toBe('tab-1')
  })

  // The user types a name, then grabs the tab without pressing Enter: the press lands while the
  // rename is still open, and the browser blurs (commits) the field only after pointerdown.
  it('drags when the tab is grabbed straight out of an open rename', async () => {
    render(<Strip title="Terminal" />)
    await act(async () => {
      fireEvent.doubleClick(tabRoot())
    })
    const input = screen.getByRole<HTMLInputElement>('textbox')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.pointerDown(tabRoot(), {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 10,
      clientY: 10
    })
    await act(async () => {
      fireEvent.blur(input)
    })
    fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: 40, clientY: 10 })
    fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: 60, clientY: 10 })
    const active = screen.getByTestId('active-drag').textContent
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 60, clientY: 10 })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(active).toBe('tab-1')
  })

  it('never drags from a press inside the open rename field', async () => {
    render(<Strip title="Terminal" />)
    await act(async () => {
      fireEvent.doubleClick(tabRoot())
    })
    const input = screen.getByRole<HTMLInputElement>('textbox')
    fireEvent.pointerDown(input, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 10,
      clientY: 10
    })
    fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: 60, clientY: 10 })
    const active = screen.getByTestId('active-drag').textContent
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 60, clientY: 10 })
    expect(active).toBe('idle')
    expect(screen.getByRole('textbox')).toBe(input)
  })
})
