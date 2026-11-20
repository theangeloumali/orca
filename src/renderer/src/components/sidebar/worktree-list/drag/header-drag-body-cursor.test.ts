import { describe, expect, it, vi } from 'vitest'
import { applyHeaderDragBodyStyle } from './header-drag-body-cursor'

describe('applyHeaderDragBodyStyle', () => {
  it('clears text the press selected before the drag began, then restores the body', () => {
    const body = { style: { cursor: 'auto', userSelect: 'text' } }
    const selection = { removeAllRanges: vi.fn() }
    const restore = applyHeaderDragBodyStyle(body, selection)
    expect(selection.removeAllRanges).toHaveBeenCalledTimes(1)
    expect(body.style).toEqual({ cursor: 'grabbing', userSelect: 'none' })
    restore()
    expect(body.style).toEqual({ cursor: 'auto', userSelect: 'text' })
  })
})
