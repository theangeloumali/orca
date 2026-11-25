// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { resolveDropZone } from './pane-drag-pointer'

const rect = new DOMRect(0, 0, 100, 100)

describe('resolveDropZone', () => {
  it('picks the edge nearest the pointer', () => {
    expect(resolveDropZone(50, 5, rect)).toBe('top')
    expect(resolveDropZone(50, 95, rect)).toBe('bottom')
    expect(resolveDropZone(5, 50, rect)).toBe('left')
    expect(resolveDropZone(95, 50, rect)).toBe('right')
  })

  it('breaks a tie in favour of the first zone, top', () => {
    expect(resolveDropZone(50, 50, rect)).toBe('top')
  })
})
