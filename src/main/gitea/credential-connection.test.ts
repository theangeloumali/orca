import { mkdtempSync, rmSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import type * as os from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSecretStore } from '../../shared/secure-storage/secret-store'

const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (actual) => ({
  ...(await actual<typeof os>()),
  homedir: () => home.dir
}))

const repoHost = vi.hoisted(() => ({ value: 'git.example.test' }))
vi.mock('../source-control/hosted-review-execution-host', () => ({
  hostedReviewSshConnectionId: () => null
}))
vi.mock('./repository-ref', () => ({
  getGiteaRepoRef: async () => ({
    host: repoHost.value,
    owner: 'angelo',
    repo: 'orca',
    apiBaseUrl: `https://${repoHost.value}/api/v1`,
    webBaseUrl: `https://${repoHost.value}`
  })
}))

const { connectGitea, disconnectGitea, getGiteaConnectionStatus } =
  await import('./credential-connection')
const { _resetGiteaCredentialCache } = await import('./credential-store')
const { resolveGiteaAuthForHost } = await import('./resolve-auth')
const { getGiteaAuthStatus } = await import('./auth-status')
const { getGiteaPullRequest } = await import('./client')
const { createGiteaPullRequest, isGiteaReviewCreationAuthenticated } =
  await import('./pull-request-creation')

const FAKE_TOKEN = 'fake-gitea-token'
const SERVER_URL = 'https://git.example.test/'
const API_BASE_URL = 'https://git.example.test/api/v1'

type FetchCall = { url: string; authorization: string | null }
let fetchCalls: FetchCall[] = []

function stubFetch(respond: (url: string) => Response | Promise<Response>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      fetchCalls.push({ url, authorization: headers.get('Authorization') })
      return respond(url)
    })
  )
}

function userResponse(): Response {
  return new Response(JSON.stringify({ login: 'angelo' }), { status: 200 })
}

async function orcaFiles(): Promise<string[]> {
  return readdir(join(home.dir, '.orca')).catch(() => [])
}

beforeEach(() => {
  home.dir = mkdtempSync(join(tmpdir(), 'gitea-credential-'))
  fetchCalls = []
  vi.stubEnv('ORCA_GITEA_TOKEN', '')
  vi.stubEnv('ORCA_GITEA_API_BASE_URL', '')
  setSecretStore({
    isEncryptionAvailable: () => true,
    encryptString: (plaintext) => Buffer.from(`encrypted:${plaintext}`),
    decryptString: (ciphertext) => ciphertext.toString().slice('encrypted:'.length),
    describeProtectionGap: () => null
  })
  _resetGiteaCredentialCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  rmSync(home.dir, { recursive: true, force: true })
})

describe('connectGitea', () => {
  it('verifies the token against the normalized /api/v1 base URL', async () => {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(fetchCalls).toEqual([
      { url: `${API_BASE_URL}/user`, authorization: `token ${FAKE_TOKEN}` }
    ])
  })

  it('saves nothing and reports rejected when the server answers 401', async () => {
    stubFetch(() => new Response('{}', { status: 401 }))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'rejected' })
    expect(await orcaFiles()).toEqual([])
    expect((await getGiteaConnectionStatus()).configured).toBe(false)
  })

  it('reports unreachable when the server cannot be reached', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'unreachable' })
    expect(await orcaFiles()).toEqual([])
  })

  it('rejects a non-http server URL without a request', async () => {
    stubFetch(userResponse)
    const result = await connectGitea({ baseUrl: 'ftp://git.example.test', token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'invalidBaseUrl' })
    expect(fetchCalls).toEqual([])
  })

  it('saves the credential and reports the account on success', async () => {
    stubFetch(userResponse)
    expect(await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })).toEqual({
      ok: true,
      account: 'angelo'
    })
    expect(await getGiteaConnectionStatus()).toMatchObject({
      configured: true,
      source: 'stored',
      account: 'angelo',
      baseUrl: API_BASE_URL
    })
  })
})

describe('stored Gitea auth resolution', () => {
  async function connectStored(): Promise<void> {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    _resetGiteaCredentialCache()
    fetchCalls = []
  }

  it('uses the stored token for a repo on the same host', async () => {
    await connectStored()
    expect(await resolveGiteaAuthForHost('git.example.test')).toEqual({
      apiBaseUrl: API_BASE_URL,
      token: FAKE_TOKEN
    })
  })

  it('sends no token to a repo on another host', async () => {
    await connectStored()
    expect(await resolveGiteaAuthForHost('gitea.other.test')).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })

  it('sends the stored token only on requests to the saved host', async () => {
    await connectStored()
    stubFetch(() => new Response('{}', { status: 404 }))
    await getGiteaPullRequest('/repo', 1)
    repoHost.value = 'gitea.other.test'
    await getGiteaPullRequest('/repo', 1)
    repoHost.value = 'git.example.test'
    expect(fetchCalls.map((call) => call.authorization)).toEqual([`token ${FAKE_TOKEN}`, null])
  })

  it('creates pull requests with the stored token', async () => {
    await connectStored()
    expect(await isGiteaReviewCreationAuthenticated()).toBe(true)
    stubFetch(() => new Response('{}', { status: 401 }))
    const result = await createGiteaPullRequest(
      '/repo',
      { provider: 'gitea', base: 'main', head: 'feature', title: 'Add token' },
      'local'
    )
    expect(result).toMatchObject({ ok: false, code: 'auth_required' })
    expect(fetchCalls[0]).toEqual({
      url: `${API_BASE_URL}/repos/angelo/orca/pulls`,
      authorization: `token ${FAKE_TOKEN}`
    })
  })

  it('lets environment variables override the stored credential', async () => {
    await connectStored()
    vi.stubEnv('ORCA_GITEA_TOKEN', 'fake-env-token')
    expect(await resolveGiteaAuthForHost('git.example.test')).toEqual({
      apiBaseUrl: null,
      token: 'fake-env-token'
    })
    expect((await getGiteaConnectionStatus()).source).toBe('environment')
  })

  it('reports the stored account in preflight status', async () => {
    await connectStored()
    expect(await getGiteaAuthStatus()).toEqual({
      configured: true,
      authenticated: true,
      account: 'angelo',
      baseUrl: API_BASE_URL,
      tokenConfigured: true
    })
  })

  it('disconnect clears the stored credential', async () => {
    await connectStored()
    await disconnectGitea()
    expect(await orcaFiles()).toEqual([])
    expect((await getGiteaConnectionStatus()).configured).toBe(false)
    expect(await resolveGiteaAuthForHost('git.example.test')).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })
})
