// @vitest-environment happy-dom
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { SerializeAddon } from '@xterm/addon-serialize'
import { useRef, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ManagedPane } from '@/lib/pane-manager/pane-manager-types'
import { PANE_DRAG_THRESHOLD_PX } from '@/lib/pane-manager/pane-layout/pane-drag-pointer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isTerminalLeafId } from '../../../../../shared/workspace-layout/stable-pane-id'
import TerminalPaneHeaderOverlay from './TerminalPaneHeaderOverlay'

const noop = (): void => {}

function makePane(id: number): ManagedPane {
  const leafId = `00000000-0000-4000-8000-00000000000${id}`
  if (!isTerminalLeafId(leafId)) {
    throw new Error('fixture leaf id is not a terminal leaf id')
  }
  return {
    id,
    leafId,
    stablePaneId: leafId,
    terminal: new Terminal(),
    container: document.createElement('div'),
    linkTooltip: document.createElement('div'),
    fitAddon: new FitAddon(),
    searchAddon: new SearchAddon(),
    serializeAddon: new SerializeAddon()
  }
}

const panes = [makePane(1), makePane(2)]

// Mirrors the pane manager: a press arms a drag that starts once the pointer passes the threshold.
function Harness(): React.JSX.Element {
  const managerRef = useRef(null)
  const transportsRef = useRef(new Map())
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [renamingPaneId, setRenamingPaneId] = useState<number | null>(null)
  const [draggingPaneId, setDraggingPaneId] = useState<number | null>(null)
  const beginPaneDrag = (paneId: number, _handle: HTMLElement, event: PointerEvent): void => {
    const onMove = (move: PointerEvent): void => {
      const travel = Math.hypot(move.clientX - event.clientX, move.clientY - event.clientY)
      if (travel >= PANE_DRAG_THRESHOLD_PX) {
        setDraggingPaneId(paneId)
      }
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  return (
    <TooltipProvider>
      <TerminalPaneHeaderOverlay
        tabId="tab"
        worktreeId="wt"
        cwd="/tmp"
        showAlwaysOnHeaders
        isTabPinned={false}
        paneCount={2}
        activePaneId={1}
        panes={panes}
        paneTitles={{ 1: 'Build' }}
        paneTitleOverlayRects={{
          1: { left: 0, top: 0, width: 300 },
          2: { left: 300, top: 0, width: 300 }
        }}
        renamingPaneId={renamingPaneId}
        renameValue="Build"
        renameInputRef={inputRef}
        titleUsesLightSurface={false}
        paneTitleBackground="#000"
        terminalContentVisible
        hiddenStartupStyle={{}}
        managerRef={managerRef}
        paneTransportsRef={transportsRef}
        onSplitPane={noop}
        onBeginPaneDrag={beginPaneDrag}
        onActivatePaneTitleInteraction={noop}
        onPaneTitleContextMenu={noop}
        onStartRename={setRenamingPaneId}
        onRemoveTitle={noop}
        onClosePane={noop}
        onRenameValueChange={noop}
        onRenameSubmit={noop}
        onRenameCancel={noop}
        onRenameBlur={noop}
      />
      <output data-testid="dragging-pane">{draggingPaneId ?? 'none'}</output>
    </TooltipProvider>
  )
}

function title(): HTMLElement {
  return screen.getByRole('button', { name: /Edit pane title/ })
}

const PRESS_X = 10

// The title holds pointer capture while armed, so moves land on it and bubble to window.
function pressTitle(...moveXs: number[]): void {
  const target = title()
  fireEvent.pointerDown(target, { button: 0, pointerId: 1, clientX: PRESS_X, clientY: 10 })
  for (const clientX of moveXs) {
    fireEvent.pointerMove(target, { pointerId: 1, clientX, clientY: 10 })
  }
  const releaseX = moveXs.at(-1) ?? PRESS_X
  act(() => {
    window.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, clientX: releaseX, clientY: 10 })
    )
  })
  fireEvent.click(target, { clientX: releaseX, clientY: 10, detail: 1 })
}

describe('TerminalPaneHeaderOverlay title drag', () => {
  afterEach(cleanup)

  it('drags the pane when the title moves past the threshold, without opening rename', () => {
    render(<Harness />)
    pressTitle(PRESS_X + PANE_DRAG_THRESHOLD_PX)
    expect(screen.getByTestId('dragging-pane').textContent).toBe('1')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('opens rename on a plain click of the title', () => {
    render(<Harness />)
    pressTitle()
    expect(screen.getByTestId('dragging-pane').textContent).toBe('none')
    expect(screen.getByRole('textbox')).not.toBeNull()
  })

  it('keeps rename closed after a drag that comes back to where it started', () => {
    render(<Harness />)
    pressTitle(PRESS_X + 40, PRESS_X)
    expect(screen.getByTestId('dragging-pane').textContent).toBe('1')
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
