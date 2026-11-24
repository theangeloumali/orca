// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import StatusIndicator from './StatusIndicator'
import { WorktreeCardStatusSlot } from './WorktreeCardStatusSlot'

const noop = (): void => {}
const highlightOf = (container: HTMLElement): string | null =>
  container.querySelector('[data-session-highlight]')?.getAttribute('data-session-highlight') ??
  null

describe('row session highlight', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('leaves an idle parent unlit while its collapsed child works', () => {
    const { container } = render(
      <TooltipProvider>
        <WorktreeCardStatusSlot
          worktreeId="wt-parent"
          showStatus
          showUnreadAction={false}
          isUnread={false}
          lineageStatus="working"
          unreadTooltip=""
          onToggleUnread={noop}
          onPointerDown={noop}
        />
      </TooltipProvider>
    )
    expect(highlightOf(container)).toBeNull()
  })

  it('lights the row from its own status, not the lane glyph', () => {
    const idleParent = render(
      <TooltipProvider>
        <StatusIndicator status="working" rowStatus="inactive" />
      </TooltipProvider>
    )
    expect(highlightOf(idleParent.container)).toBeNull()
    cleanup()
    const workingParent = render(
      <TooltipProvider>
        <StatusIndicator status="working" rowStatus="working" />
      </TooltipProvider>
    )
    expect(highlightOf(workingParent.container)).toBe('working')
  })
})
