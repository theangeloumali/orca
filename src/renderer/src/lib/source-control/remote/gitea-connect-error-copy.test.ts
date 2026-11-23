import { describe, expect, it } from 'vitest'
import { GITEA_CONNECT_FAILURE_COPY } from '../../../../../shared/gitea/gitea-credentials'
import { giteaConnectErrorField, giteaConnectErrorText } from './gitea-connect-error-copy'

describe('giteaConnectErrorText', () => {
  it('shows the copy for a known failure code', () => {
    expect(giteaConnectErrorText({ error: 'raw', errorCode: 'rejected' })).toBe(
      GITEA_CONNECT_FAILURE_COPY.rejected
    )
  })

  it('shows the host error for an unknown or missing code', () => {
    expect(giteaConnectErrorText({ error: 'raw', errorCode: 'other' })).toBe('raw')
    expect(giteaConnectErrorText({ error: 'raw' })).toBe('raw')
  })
})

describe('giteaConnectErrorField', () => {
  it('points each failure at the field it is about', () => {
    expect(giteaConnectErrorField({ errorCode: 'invalidBaseUrl' })).toBe('serverUrl')
    expect(giteaConnectErrorField({ errorCode: 'notGiteaServer' })).toBe('serverUrl')
    expect(giteaConnectErrorField({ errorCode: 'unreachable' })).toBe('serverUrl')
    expect(giteaConnectErrorField({ errorCode: 'tokenRequired' })).toBe('token')
    expect(giteaConnectErrorField({ errorCode: 'rejected' })).toBe('token')
    expect(giteaConnectErrorField({ errorCode: 'invalidInput' })).toBeNull()
    expect(giteaConnectErrorField({ errorCode: 'other' })).toBeNull()
  })
})
