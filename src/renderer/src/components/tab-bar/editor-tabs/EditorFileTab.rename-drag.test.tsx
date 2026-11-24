// @vitest-environment happy-dom
import { DndContext, useDndContext, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeOpenFile } from '@/store/slices/editor/types/open-file.test-fixture'
import { TabDragPointerSensor } from '../../tab-group/drag/tab-drag-pointer-sensor'
import { TabStripTooltipProvider } from '../strip/TabStripTooltipProvider'
import EditorFileTab from './EditorFileTab'

const noop = (): void => {}
const sensorOptions = { activationConstraint: { distance: 5 } }
const file = {
  ...makeOpenFile({ id: '/repo/notes.ts', worktreeId: 'wt', relativePath: 'notes.ts' }),
  tabId: 'tab-1'
}

function ActiveDrag(): React.JSX.Element {
  const { active } = useDndContext()
  return <output data-testid="active-drag">{active ? String(active.id) : 'idle'}</output>
}

function Strip(): React.JSX.Element {
  const sensors = useSensors(useSensor(TabDragPointerSensor, sensorOptions))
  return (
    <DndContext sensors={sensors}>
      <SortableContext items={['tab-1']}>
        <TabStripTooltipProvider>
          <EditorFileTab
            file={file}
            isActive
            isPinned={false}
            hasTabsToRight
            hasTabsToLeft={false}
            tabCount={2}
            gitStatus={null}
            onActivate={noop}
            onClose={noop}
            onCloseOthers={noop}
            onCloseToRight={noop}
            onCloseToLeft={noop}
            onCloseAll={noop}
            onTogglePin={noop}
            dragData={{
              kind: 'tab',
              worktreeId: 'wt',
              groupId: 'group',
              unifiedTabId: 'tab-1',
              visibleTabId: 'tab-1',
              tabType: 'editor',
              label: 'notes.ts',
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
  const root = document.querySelector<HTMLElement>('[data-tab-id="tab-1"]')
  if (!root) {
    throw new Error('tab root not rendered')
  }
  return root
}

async function openRename(): Promise<HTMLInputElement> {
  await act(async () => {
    fireEvent.doubleClick(screen.getByText('notes.ts'))
  })
  return screen.getByRole<HTMLInputElement>('textbox')
}

function dragFrom(target: HTMLElement): string {
  fireEvent.pointerDown(target, {
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

describe('EditorFileTab drag around rename', () => {
  afterEach(cleanup)

  // The browser blurs (commits) the field only after the pointerdown that grabs the tab.
  it('drags when the tab is grabbed straight out of an open rename', async () => {
    render(<Strip />)
    const input = await openRename()
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
    render(<Strip />)
    const input = await openRename()
    expect(dragFrom(input)).toBe('idle')
    expect(screen.getByRole('textbox')).toBe(input)
  })
})
