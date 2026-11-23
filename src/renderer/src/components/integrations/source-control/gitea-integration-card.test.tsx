// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GiteaConnectionStatus } from '../../../../../shared/gitea/gitea-credentials'

const preflight = vi.hoisted(() => ({ giteaStatus: 'configured' }))
vi.mock('./source-control-preflight-card-status', () => ({
  usePreflightCardStatuses: () => ({
    statuses: { giteaStatus: preflight.giteaStatus, giteaAccount: null, giteaBaseUrl: null },
    unavailable: false,
    refresh: () => {}
  })
}))

const { GiteaIntegrationCard } = await import('./gitea-integration-card')

const STORED: GiteaConnectionStatus = {
  configured: true,
  source: 'stored',
  credentialProtection: 'sealed',
  account: 'angelo',
  baseUrl: 'https://git.example.test/api/v1',
  credentialError: null,
  checkedSinceRestart: true
}
const DECRYPT_ERROR = 'Gitea credentials could not be decrypted.'

const status = vi.fn()
const disconnect = vi.fn()

beforeEach(() => {
  preflight.giteaStatus = 'configured'
  status.mockReset()
  disconnect.mockReset()
  disconnect.mockResolvedValue(undefined)
  Reflect.set(window, 'api', { gitea: { status, disconnect, connect: vi.fn() } })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'api')
})

describe('GiteaIntegrationCard', () => {
  it('points browser clients at the desktop app instead of calling a missing bridge', async () => {
    Reflect.set(window, 'api', {})
    render(<GiteaIntegrationCard />)
    expect(await screen.findByText('Connect Gitea / Forgejo from the desktop app')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
  })

  it('shows a decryption error and still offers Disconnect', async () => {
    preflight.giteaStatus = 'not-authenticated'
    status.mockResolvedValue({
      ...STORED,
      credentialError: DECRYPT_ERROR,
      checkedSinceRestart: false
    })
    render(<GiteaIntegrationCard />)
    expect(await screen.findByText(DECRYPT_ERROR)).toBeTruthy()
    expect(screen.queryByText('Saved · not checked since restart')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Gitea / Forgejo' }))
    await waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1))
  })

  it('says the saved token is unchecked until a request succeeds', async () => {
    status.mockResolvedValue({ ...STORED, checkedSinceRestart: false })
    render(<GiteaIntegrationCard />)
    expect(await screen.findByText('Saved · not checked since restart')).toBeTruthy()
  })

  it('drops the unchecked note once the token has worked', async () => {
    status.mockResolvedValue(STORED)
    render(<GiteaIntegrationCard />)
    expect(await screen.findByRole('button', { name: 'Disconnect Gitea / Forgejo' })).toBeTruthy()
    expect(screen.queryByText('Saved · not checked since restart')).toBeNull()
  })
})
