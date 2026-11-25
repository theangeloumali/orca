// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomColorDialog } from './CustomColorDialog'

afterEach(cleanup)

function renderDialog(onSave: (color: string) => void, onOpenChange = vi.fn()): void {
  render(
    <CustomColorDialog
      open
      onOpenChange={onOpenChange}
      currentColor="#ef4444"
      title="Custom group color"
      description="Group colors sync with the group."
      pickerLabel="Group color"
      onSave={onSave}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Group color' }))
  fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#123456' } })
}

describe('CustomColorDialog', () => {
  it('saves the draft only when Done is pressed', () => {
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    renderDialog(onSave, onOpenChange)
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onSave).toHaveBeenCalledWith('#123456')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
