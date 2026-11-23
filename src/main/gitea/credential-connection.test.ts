import { mkdtempSync, rmSync } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import type * as fsPromises from 'node:fs/promises'
import type * as os from 'node:os'
import type * as repositoryRef from './repository-ref'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSecretStore } from '../../shared/secure-storage/secret-store'

const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (actual) => ({
  ...(await actual<typeof os>()),
  homedir: () => home.dir
}))

// Lets a test fail one unlink to simulate a disconnect that stops partway.
const unlinkFailure = vi.hoisted(() => ({ pathSuffix: '' }))
vi.mock('node:fs/promises', async (actual) => {
  const real = await actual<typeof fsPromises>()
  return {
    ...real,
    unlink: async (path: string) => {
      if (unlinkFailure.pathSuffix && path.endsWith(unlinkFailure.pathSuffix)) {
        throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
      }
      return real.unlink(path)
    }
  }
})

// The real parser turns this remote into the repo ref, so SSH and scp remotes are exercised too.
const DEFAULT_REMOTE = 'https://git.example.test/angelo/orca.git'
const remote = vi.hoisted(() => ({ url: '' }))
vi.mock('../source-control/hosted-review-execution-host', () => ({
  hostedReviewSshConnectionId: () => null
}))
vi.mock('./repository-ref', async (actual) => {
  const real = await actual<typeof repositoryRef>()
  return { ...real, getGiteaRepoRef: async () => real.parseGiteaRepoRef(remote.url) }
})

const { connectGitea, disconnectGitea, getGiteaConnectionStatus } =
  await import('./credential-connection')
const { _resetGiteaCredentialCache } = await import('./credential-store')
const { resolveGiteaAuthForRepo } = await import('./resolve-auth')
const { getGiteaAuthStatus } = await import('./auth-status')
const { getGiteaPullRequest } = await import('./client')
const { parseGiteaRepoRef } = await import('./repository-ref')
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const SCOPE_REFUSAL = {
  message: 'token does not have at least one of required scope(s): [read:user]'
}

function apiBaseFor(origin: string): string {
  return `${origin}/api/v1`
}

function httpsRepo(apiBaseUrl: string): { apiBaseUrl: string; isSshRemote: boolean } {
  return { apiBaseUrl, isSshRemote: false }
}

function repoFor(remoteUrl: string): repositoryRef.GiteaRepoRef {
  const repo = parseGiteaRepoRef(remoteUrl)
  if (!repo) {
    throw new Error(`not a Gitea remote: ${remoteUrl}`)
  }
  return repo
}

async function orcaFiles(): Promise<string[]> {
  return readdir(join(home.dir, '.orca')).catch(() => [])
}

beforeEach(() => {
  home.dir = mkdtempSync(join(tmpdir(), 'gitea-credential-'))
  fetchCalls = []
  remote.url = DEFAULT_REMOTE
  unlinkFailure.pathSuffix = ''
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

  it('refuses plain http for a server that is not loopback', async () => {
    stubFetch(userResponse)
    const result = await connectGitea({ baseUrl: 'http://git.example.test', token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'invalidBaseUrl' })
    expect(fetchCalls).toEqual([])
  })

  it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'])(
    'allows plain http for the loopback server %s',
    async (serverUrl) => {
      stubFetch(userResponse)
      expect(await connectGitea({ baseUrl: serverUrl, token: FAKE_TOKEN })).toMatchObject({
        ok: true
      })
      expect(fetchCalls[0]?.url).toBe(`${serverUrl}/api/v1/user`)
    }
  )

  it.each([
    'https://angelo@git.example.test',
    'https://angelo:secret@git.example.test',
    'https://git.example.test/?tab=1',
    'https://git.example.test/#top'
  ])('rejects %s without a request', async (serverUrl) => {
    stubFetch(userResponse)
    const result = await connectGitea({ baseUrl: serverUrl, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'invalidBaseUrl' })
    expect(fetchCalls).toEqual([])
  })

  it('keeps a URL that already ends in /api/v1', async () => {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: `${API_BASE_URL}/`, token: FAKE_TOKEN })
    expect(fetchCalls.map((call) => call.url)).toEqual([`${API_BASE_URL}/user`])
  })

  it('keeps a server subpath', async () => {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: 'https://git.example.test/forge/', token: FAKE_TOKEN })
    expect(fetchCalls.map((call) => call.url)).toEqual([
      'https://git.example.test/forge/api/v1/user'
    ])
    expect((await getGiteaConnectionStatus()).baseUrl).toBe('https://git.example.test/forge/api/v1')
  })

  it('reports tokenRequired for a blank token without a request', async () => {
    stubFetch(userResponse)
    const result = await connectGitea({ baseUrl: SERVER_URL, token: '   ' })
    expect(result).toMatchObject({ ok: false, errorCode: 'tokenRequired' })
    expect(fetchCalls).toEqual([])
  })

  it('reports rejected for a 403 that is not about scopes', async () => {
    stubFetch(() => jsonResponse({ message: 'user is prohibited' }, 403))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'rejected' })
    expect(fetchCalls).toHaveLength(1)
    expect(await orcaFiles()).toEqual([])
  })

  it('reports unreachable when the server answers 500', async () => {
    stubFetch(() => jsonResponse({}, 500))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'unreachable' })
  })

  it('reports notGiteaServer when /user is 404', async () => {
    stubFetch(() => jsonResponse({}, 404))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'notGiteaServer' })
    expect(await orcaFiles()).toEqual([])
  })

  it('rejects a /user 200 with neither login nor id', async () => {
    stubFetch(() => jsonResponse({ full_name: 'Angelo' }))
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'rejected' })
    expect(await orcaFiles()).toEqual([])
  })

  it('saves a repo-scoped token when /user lacks scope and /version answers', async () => {
    stubFetch((url) =>
      url.endsWith('/user') ? jsonResponse(SCOPE_REFUSAL, 403) : jsonResponse({ version: '11.0.1' })
    )
    expect(await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })).toEqual({
      ok: true,
      account: null
    })
    expect(fetchCalls).toEqual([
      { url: `${API_BASE_URL}/user`, authorization: `token ${FAKE_TOKEN}` },
      { url: `${API_BASE_URL}/version`, authorization: `token ${FAKE_TOKEN}` }
    ])
    expect(await getGiteaConnectionStatus()).toMatchObject({ configured: true, account: null })
  })

  it('rejects a repo-scoped token when /version answers 401', async () => {
    stubFetch((url) =>
      url.endsWith('/user') ? jsonResponse(SCOPE_REFUSAL, 403) : jsonResponse({}, 401)
    )
    const result = await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(result).toMatchObject({ ok: false, errorCode: 'rejected' })
    expect(await orcaFiles()).toEqual([])
  })

  it('saves a plaintext credential when OS encryption is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setSecretStore({
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.from(''),
      decryptString: () => '',
      describeProtectionGap: () => null
    })
    stubFetch(userResponse)
    expect(await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })).toMatchObject({
      ok: true
    })
    expect(await getGiteaConnectionStatus()).toMatchObject({
      configured: true,
      credentialProtection: 'plaintext'
    })
    expect(warn.mock.calls.flat().join(' ')).not.toContain(FAKE_TOKEN)
    warn.mockRestore()
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
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: API_BASE_URL,
      token: FAKE_TOKEN
    })
  })

  it('sends no token to a repo on another host', async () => {
    await connectStored()
    expect(
      await resolveGiteaAuthForRepo(httpsRepo(apiBaseFor('https://gitea.other.test')))
    ).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })

  it('sends the stored token only on requests to the saved host', async () => {
    await connectStored()
    stubFetch(() => new Response('{}', { status: 404 }))
    await getGiteaPullRequest('/repo', 1)
    remote.url = 'https://gitea.other.test/angelo/orca.git'
    await getGiteaPullRequest('/repo', 1)
    expect(fetchCalls.map((call) => call.authorization)).toEqual([`token ${FAKE_TOKEN}`, null])
  })

  it('creates pull requests with the stored token', async () => {
    await connectStored()
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(true)
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
    vi.stubEnv('ORCA_GITEA_API_BASE_URL', SERVER_URL)
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: API_BASE_URL,
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
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })
  it.each([
    ['a different port', 'https://git.example.test:3000'],
    ['a different scheme', 'http://git.example.test']
  ])('sends no token to a repo on %s', async (_case, origin) => {
    await connectStored()
    expect(await resolveGiteaAuthForRepo(httpsRepo(apiBaseFor(origin)))).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })

  it('matches the saved host case-insensitively', async () => {
    await connectStored()
    expect(await resolveGiteaAuthForRepo(httpsRepo('https://GIT.Example.test/api/v1'))).toEqual({
      apiBaseUrl: API_BASE_URL,
      token: FAKE_TOKEN
    })
  })

  it('never sends an env token when no env base URL is set', async () => {
    vi.stubEnv('ORCA_GITEA_TOKEN', 'fake-env-token')
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: null,
      token: null
    })
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(false)
  })

  it('sends an env token only to the env base URL origin', async () => {
    vi.stubEnv('ORCA_GITEA_TOKEN', 'fake-env-token')
    vi.stubEnv('ORCA_GITEA_API_BASE_URL', SERVER_URL)
    expect(
      await resolveGiteaAuthForRepo(httpsRepo(apiBaseFor('https://gitea.other.test')))
    ).toEqual({
      apiBaseUrl: null,
      token: null
    })
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(true)
  })

  it('overrides only matching repos when just the env base URL is set', async () => {
    vi.stubEnv('ORCA_GITEA_API_BASE_URL', 'https://git.example.test/forge')
    expect(await getGiteaConnectionStatus()).toMatchObject({
      source: 'environment',
      baseUrl: 'https://git.example.test/forge/api/v1'
    })
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: 'https://git.example.test/forge/api/v1',
      token: null
    })
    expect(
      await resolveGiteaAuthForRepo(httpsRepo(apiBaseFor('https://gitea.other.test')))
    ).toEqual({
      apiBaseUrl: null,
      token: null
    })
  })

  it('a disconnect that fails partway re-reads the disk instead of reporting disconnected', async () => {
    await connectStored()
    unlinkFailure.pathSuffix = 'gitea-credential.enc'
    await expect(disconnectGitea()).rejects.toThrow('EACCES')
    expect(await getGiteaConnectionStatus()).toMatchObject({ configured: true, source: 'stored' })
  })

  it('reports a decryption failure and still disconnects', async () => {
    await connectStored()
    await writeFile(
      join(home.dir, '.orca', 'gitea-credential.enc'),
      Buffer.from([0xff, 0x00, 0x01])
    )
    setSecretStore({
      isEncryptionAvailable: () => true,
      encryptString: () => Buffer.from(''),
      decryptString: () => {
        throw new Error('keychain locked')
      },
      describeProtectionGap: () => null
    })
    expect(await resolveGiteaAuthForRepo(httpsRepo(API_BASE_URL))).toEqual({
      apiBaseUrl: null,
      token: null
    })
    const status = await getGiteaConnectionStatus()
    expect(status).toMatchObject({ configured: true, source: 'stored' })
    expect(status.credentialError).toEqual(expect.any(String))
    expect((await getGiteaAuthStatus()).authenticated).toBe(false)
    await disconnectGitea()
    expect(await getGiteaConnectionStatus()).toMatchObject({
      configured: false,
      credentialError: null
    })
  })

  it('reports the stored token unchecked after a restart until a request succeeds', async () => {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect((await getGiteaConnectionStatus()).checkedSinceRestart).toBe(true)
    _resetGiteaCredentialCache()
    expect((await getGiteaConnectionStatus()).checkedSinceRestart).toBe(false)
    stubFetch(() => jsonResponse({}, 401))
    await getGiteaPullRequest('/repo', 1)
    expect((await getGiteaConnectionStatus()).checkedSinceRestart).toBe(false)
    stubFetch(() => jsonResponse({ number: 1 }))
    await getGiteaPullRequest('/repo', 1)
    expect((await getGiteaConnectionStatus()).checkedSinceRestart).toBe(true)
  })
})

describe('Gitea auth for SSH remotes', () => {
  const SAVED_ON_PORT = 'https://git.example.test:3000'

  async function connectOnPort(): Promise<void> {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: SAVED_ON_PORT, token: FAKE_TOKEN })
    _resetGiteaCredentialCache()
    fetchCalls = []
  }

  it.each([
    ['an ssh:// remote', 'ssh://git@git.example.test:2222/angelo/orca.git'],
    ['an scp-style remote', 'git@git.example.test:angelo/orca.git']
  ])('sends the token to the saved API port for %s on the saved host', async (_case, url) => {
    await connectOnPort()
    expect(await resolveGiteaAuthForRepo(repoFor(url))).toEqual({
      apiBaseUrl: apiBaseFor(SAVED_ON_PORT),
      token: FAKE_TOKEN
    })
    remote.url = url
    stubFetch(() => jsonResponse({}, 404))
    await getGiteaPullRequest('/repo', 1)
    expect(fetchCalls[0]).toEqual({
      url: `${apiBaseFor(SAVED_ON_PORT)}/repos/angelo/orca/pulls/1`,
      authorization: `token ${FAKE_TOKEN}`
    })
  })

  it('sends no token to an SSH remote on another host', async () => {
    await connectOnPort()
    const repo = repoFor('ssh://git@gitea.other.test:2222/angelo/orca.git')
    expect(await resolveGiteaAuthForRepo(repo)).toEqual({ apiBaseUrl: null, token: null })
  })

  it('still sends no token to an https remote on another port', async () => {
    await connectOnPort()
    const repo = repoFor('https://git.example.test:8443/angelo/orca.git')
    expect(await resolveGiteaAuthForRepo(repo)).toEqual({ apiBaseUrl: null, token: null })
  })

  it('matches an env base URL to an SSH remote by hostname', async () => {
    vi.stubEnv('ORCA_GITEA_TOKEN', 'fake-env-token')
    vi.stubEnv('ORCA_GITEA_API_BASE_URL', SAVED_ON_PORT)
    const repo = repoFor('git@GIT.example.test:angelo/orca.git')
    expect(await resolveGiteaAuthForRepo(repo)).toEqual({
      apiBaseUrl: apiBaseFor(SAVED_ON_PORT),
      token: 'fake-env-token'
    })
  })
})

describe('Gitea review creation eligibility', () => {
  it('reports a repo on another server as not authenticated with a stored token', async () => {
    stubFetch(userResponse)
    await connectGitea({ baseUrl: SERVER_URL, token: FAKE_TOKEN })
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(true)
    remote.url = 'https://gitea.other.test/angelo/orca.git'
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(false)
  })

  it('reports a repo on another server as not authenticated with an env token', async () => {
    vi.stubEnv('ORCA_GITEA_TOKEN', 'fake-env-token')
    vi.stubEnv('ORCA_GITEA_API_BASE_URL', SERVER_URL)
    remote.url = 'https://gitea.other.test/angelo/orca.git'
    expect(await isGiteaReviewCreationAuthenticated('/repo', 'local')).toBe(false)
  })
})
