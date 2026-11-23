// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GITEA_CONNECT_FAILURE_COPY } from '../../../../../shared/gitea/gitea-credentials'
import { GiteaCredentialsDialog } from './gitea-credentials-dialog'

const FAKE_TOKEN = 'fake-gitea-token'
const connect = vi.fn()

beforeEach(() => {
  connect.mockReset()
  Reflect.set(window, 'api', { gitea: { connect } })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'api')
})

function renderDialog(): void {
  render(<GiteaCredentialsDialog open onOpenChange={() => {}} />)
}

function submit(): void {
  fireEvent.change(screen.getByLabelText('Server URL'), {
    target: { value: 'https://git.example.test' }
  })
  fireEvent.change(screen.getByLabelText('Access token'), { target: { value: FAKE_TOKEN } })
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
}

describe('GiteaCredentialsDialog', () => {
  it('clears the token field after a successful connect', async () => {
    connect.mockResolvedValue({ ok: true, account: 'angelo' })
    renderDialog()
    submit()
    await waitFor(() => expect(screen.getByLabelText('Access token')).toHaveProperty('value', ''))
    expect(connect).toHaveBeenCalledWith({ baseUrl: 'https://git.example.test', token: FAKE_TOKEN })
  })

  it('marks only the token field invalid when the token is rejected', async () => {
    connect.mockResolvedValue({
      ok: false,
      errorCode: 'rejected',
      error: GITEA_CONNECT_FAILURE_COPY.rejected
    })
    renderDialog()
    submit()
    expect(await screen.findByText(GITEA_CONNECT_FAILURE_COPY.rejected)).toBeTruthy()
    expect(screen.getByLabelText('Access token').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Server URL').getAttribute('aria-invalid')).toBe('false')
  })

  it('marks only the server URL invalid when the URL is not a Gitea server', async () => {
    connect.mockResolvedValue({
      ok: false,
      errorCode: 'notGiteaServer',
      error: GITEA_CONNECT_FAILURE_COPY.notGiteaServer
    })
    renderDialog()
    submit()
    expect(await screen.findByText(GITEA_CONNECT_FAILURE_COPY.notGiteaServer)).toBeTruthy()
    const serverUrl = screen.getByLabelText('Server URL')
    expect(serverUrl.getAttribute('aria-invalid')).toBe('true')
    expect(serverUrl.getAttribute('spellcheck')).toBe('false')
    expect(serverUrl.getAttribute('name')).toBe('serverUrl')
    expect(screen.getByLabelText('Access token').getAttribute('aria-invalid')).toBe('false')
  })

  it('shows the unwrapped IPC error when the connect call throws', async () => {
    connect.mockRejectedValue(
      new Error("Error invoking remote method 'gitea:connect': Error: keychain is locked")
    )
    renderDialog()
    submit()
    expect(await screen.findByText('keychain is locked')).toBeTruthy()
  })
})
