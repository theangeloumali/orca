// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AgentActivityBadges } from './AgentActivityBadges'

describe('AgentActivityBadges', () => {
  afterEach(cleanup)

  it('renders nothing when every count is zero', () => {
    const { container } = render(<AgentActivityBadges needsYou={0} working={0} terminals={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('labels each count for screen readers and keeps digits tabular', () => {
    const { container } = render(<AgentActivityBadges needsYou={1} working={2} terminals={3} />)
    // A generic span cannot carry a name, so each count needs a nameable role.
    expect(screen.getByRole('img', { name: '1 need you' }).textContent).toBe('1')
    expect(screen.getByRole('img', { name: '2 working' }).textContent).toBe('2')
    expect(screen.getByRole('img', { name: '3 with open terminals' }).textContent).toBe('3')
    expect(container.firstElementChild?.className.split(' ')).toContain('tabular-nums')
  })

  it('keeps the machine header look: no terminal count when it is not passed', () => {
    render(<AgentActivityBadges needsYou={0} working={1} />)
    expect(screen.getByLabelText('1 working')).toBeTruthy()
    expect(screen.queryByLabelText(/open terminal/)).toBeNull()
  })
})
