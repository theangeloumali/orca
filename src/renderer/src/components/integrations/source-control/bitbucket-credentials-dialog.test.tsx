// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BitbucketCredentialsDialog } from './bitbucket-credentials-dialog'

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'api')
})

it('shows the unwrapped IPC error when the connect call throws', async () => {
  const connect = vi
    .fn()
    .mockRejectedValue(
      new Error("Error invoking remote method 'bitbucket:connect': Error: keychain is locked")
    )
  Reflect.set(window, 'api', { bitbucket: { connect } })
  render(<BitbucketCredentialsDialog open onOpenChange={() => {}} initialAuthMode="token" />)
  fireEvent.change(screen.getByLabelText('Access token'), {
    target: { value: 'fake-bitbucket-token' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  expect(await screen.findByText('keychain is locked')).toBeTruthy()
})
