// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import { HostColorDialog } from './HostColorDialog'

const HOST_ID = 'local'

const storedColor = (): string | undefined =>
  useAppStore.getState().settings?.hostSettingOverrides?.[HOST_ID]?.color

function renderDialog(): void {
  render(
    <HostColorDialog open onOpenChange={() => undefined} hostId={HOST_ID} currentColor="#ef4444" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Device color' }))
  fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#123456' } })
}

describe('HostColorDialog', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...getDefaultSettings('/home/test'), hostSettingOverrides: {} },
      updateSettings: async (updates) => {
        useAppStore.setState((state) => ({
          settings: state.settings ? { ...state.settings, ...updates } : state.settings
        }))
      }
    })
  })
  afterEach(cleanup)

  it('keeps the picked color as a draft until Done saves it', () => {
    renderDialog()
    expect(storedColor()).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(storedColor()).toBe('#123456')
  })
})
