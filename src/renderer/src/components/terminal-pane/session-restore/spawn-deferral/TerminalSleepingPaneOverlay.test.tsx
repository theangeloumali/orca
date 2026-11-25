// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TerminalSleepingPaneOverlay } from './TerminalSleepingPaneOverlay'

afterEach(cleanup)

describe('TerminalSleepingPaneOverlay', () => {
  it('explains an imported pane forks on resume, and resumes only on the click', () => {
    const onResume = vi.fn()
    render(<TerminalSleepingPaneOverlay reason="imported" onResume={onResume} />)

    expect(screen.getByText(/Copied from Orca/)).toBeTruthy()
    expect(onResume).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})
