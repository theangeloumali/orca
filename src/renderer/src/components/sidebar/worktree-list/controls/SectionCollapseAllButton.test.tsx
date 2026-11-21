// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SectionCollapseAllButton } from './SectionCollapseAllButton'

const HOVER_ONLY_CLASSES = ['can-hover:w-0', 'can-hover:opacity-0']

function renderToggle(alwaysVisible?: boolean): HTMLElement {
  render(
    <SectionCollapseAllButton
      allCollapsed={false}
      onToggle={() => undefined}
      collapseLabel="Collapse all"
      expandLabel="Expand all"
      alwaysVisible={alwaysVisible}
      toggleAttributes={{ 'data-testid': 'toggle' }}
    />
  )
  return screen.getByTestId('toggle')
}

describe('SectionCollapseAllButton', () => {
  afterEach(cleanup)

  it('hides until hover by default', () => {
    const classes = renderToggle().className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(HOVER_ONLY_CLASSES))
  })

  it('drops the hover-only classes when always visible', () => {
    const wrapper = renderToggle(true)
    for (const hoverClass of HOVER_ONLY_CLASSES) {
      expect(wrapper.className.split(' ')).not.toContain(hoverClass)
    }
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeTruthy()
  })
})
