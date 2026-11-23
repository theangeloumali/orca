import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, args?: unknown) => unknown
const handlers = vi.hoisted(() => new Map<string, Handler>())
const connectGitea = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) }
}))
vi.mock('../../gitea/credential-connection', () => ({
  connectGitea,
  disconnectGitea: vi.fn(),
  getGiteaConnectionStatus: vi.fn()
}))
vi.mock('../../preflight/agent-detection', () => ({ _resetPreflightCache: vi.fn() }))

const { registerGiteaHandlers } = await import('./gitea')

function invokeConnect(args: unknown): unknown {
  const handler = handlers.get('gitea:connect')
  if (!handler) {
    throw new Error('gitea:connect is not registered')
  }
  return handler({}, args)
}

beforeEach(() => {
  handlers.clear()
  connectGitea.mockReset()
  connectGitea.mockResolvedValue({ ok: true, account: null })
  registerGiteaHandlers()
})

describe('gitea:connect', () => {
  it.each([
    ['a missing token', { baseUrl: 'https://git.example.test' }],
    ['a non-string base URL', { baseUrl: 42, token: 'fake-gitea-token' }],
    [
      'a token over 4096 characters',
      { baseUrl: 'https://git.example.test', token: 'x'.repeat(4097) }
    ],
    [
      'a base URL over 2048 characters',
      { baseUrl: `https://git.example.test/${'a'.repeat(2048)}`, token: 'fake' }
    ]
  ])('answers invalidInput for %s without connecting', async (_case, args) => {
    expect(await invokeConnect(args)).toMatchObject({ ok: false, errorCode: 'invalidInput' })
    expect(connectGitea).not.toHaveBeenCalled()
  })

  it('passes a valid request to connectGitea', async () => {
    const args = { baseUrl: 'https://git.example.test', token: 'fake-gitea-token' }
    expect(await invokeConnect(args)).toEqual({ ok: true, account: null })
    expect(connectGitea).toHaveBeenCalledWith(args)
  })
})
