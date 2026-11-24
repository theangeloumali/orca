// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
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

  it('keeps an unread working card highlighted when the bell replaces its glyph', () => {
    const { container } = render(
      <TooltipProvider>
        <WorktreeCardStatusSlot
          worktreeId="wt-working"
          status="working"
          showStatus
          showUnreadAction
          isUnread
          unreadTooltip=""
          onToggleUnread={noop}
          onPointerDown={noop}
        />
      </TooltipProvider>
    )
    expect(highlightOf(container)).toBe('working')
  })
})
