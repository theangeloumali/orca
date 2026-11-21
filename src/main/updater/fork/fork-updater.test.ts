import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { ForkUpdater, type ForkUpdaterDeps } from './fork-updater'

const ZIP = new Uint8Array(Buffer.from('orca-1.4.268-arm64-zip-bytes'))
const DOWNLOAD = 'https://github.com/theangeloumali/orca/releases/download/v1.4.268-angelo.6/'
const sha512 = (bytes: Uint8Array) => createHash('sha512').update(bytes).digest('hex')

function release(
  options: { tag?: string; checksum?: string; installer?: string; host?: string } = {}
) {
  const installer = options.installer ?? 'Orca-1.4.268-arm64-mac.zip'
  const base = options.host ?? DOWNLOAD
  return vi.fn(async (url: string) => {
    if (url.endsWith('/releases/latest')) {
      return Response.json({
        tag_name: options.tag ?? 'v1.4.268-angelo.6',
        assets: [installer, 'fork-sha512sums.txt'].map((name) => ({
          name,
          browser_download_url: base + name,
          size: ZIP.length
        }))
      })
    }
    return url.endsWith('fork-sha512sums.txt')
      ? new Response(`${options.checksum ?? sha512(ZIP)}  ${installer}\n`)
      : new Response(ZIP, { headers: { 'content-length': String(ZIP.length) } })
  })
}

function updater(overrides: Partial<ForkUpdaterDeps> = {}) {
  const statuses: UpdateStatus[] = []
  const atExit: (() => void)[] = []
  const deps: ForkUpdaterDeps = {
    currentTag: 'v1.4.266-angelo.2',
    platform: 'darwin',
    appPath: '/Applications/Orca.app',
    workDir: mkdtempSync(join(tmpdir(), 'orca-fork-update-')),
    pid: 4242,
    windowsInstallDirectory: () => undefined,
    fetch: release(),
    automaticDownloads: () => true,
    checkAppReplaceable: async () => null,
    extractMacApp: vi.fn(async (_zip: string, destination: string) =>
      join(destination, 'Orca.app')
    ),
    spawnDetached: vi.fn(async () => {}),
    beforeQuit: vi.fn(async () => {}),
    onAppExit: (listener) => {
      atExit.push(listener)
      return () => {}
    },
    quit: vi.fn(),
    publish: (status) => statuses.push(status),
    ...overrides
  }
  return { forkUpdater: new ForkUpdater(deps), deps, statuses, atExit }
}

describe('ForkUpdater checks', () => {
  it('offers a newer fork release, downloads it and has it ready to install', async () => {
    const { forkUpdater, statuses } = updater()
    await forkUpdater.check(true)
    expect(statuses.map((status) => status.state)).toEqual([
      'checking',
      'available',
      'downloading',
      'downloaded'
    ])
    expect(statuses.at(-1)).toMatchObject({ state: 'downloaded', version: '1.4.268-angelo.6' })
  })

  it('reports up to date when this build is the latest fork release', async () => {
    const { forkUpdater, statuses } = updater({ currentTag: 'v1.4.268-angelo.6' })
    await forkUpdater.check(true)
    expect(statuses.at(-1)).toEqual({ state: 'not-available', userInitiated: true })
  })

  it('refuses an installer whose checksum does not match', async () => {
    const { forkUpdater, statuses } = updater({ fetch: release({ checksum: 'bad' }) })
    await forkUpdater.check(true)
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
  })

  it("refuses an installer hosted anywhere but the fork's releases", async () => {
    const { forkUpdater, statuses } = updater({ fetch: release({ host: 'https://evil.example/' }) })
    await forkUpdater.check(true)
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
  })

  it('stays quiet when a background check cannot reach GitHub', async () => {
    const { forkUpdater, statuses } = updater({
      fetch: vi.fn(async () => new Response('', { status: 403 }))
    })
    await forkUpdater.check(false)
    expect(statuses).toEqual([])
  })

  it('only offers, without downloading, when automatic updates are off', async () => {
    const { forkUpdater, statuses } = updater({ automaticDownloads: () => false })
    await forkUpdater.check(false)
    expect(statuses.map((status) => status.state)).toEqual(['available'])
    await forkUpdater.download()
    expect(statuses.at(-1)).toMatchObject({ state: 'downloaded' })
  })
})

describe('ForkUpdater install', () => {
  it('re-checks the download, unpacks it fresh and swaps the Mac app after quitting', async () => {
    const { forkUpdater, deps } = updater()
    await forkUpdater.check(false)
    expect(deps.extractMacApp).not.toHaveBeenCalled()
    expect(await forkUpdater.install()).toBe(true)
    const [command, args] = vi.mocked(deps.spawnDetached).mock.calls[0]
    expect(command).toBe('/bin/sh')
    expect(readFileSync(args[0], 'utf8')).toContain("'/Applications/Orca.app'")
    expect(deps.extractMacApp).toHaveBeenCalledOnce()
    expect(deps.quit).toHaveBeenCalledOnce()
  })

  it('refuses a second Restart while the first install is under way', async () => {
    const { forkUpdater, deps } = updater()
    await forkUpdater.check(false)
    const [first, second] = await Promise.all([forkUpdater.install(), forkUpdater.install()])
    expect([first, second]).toEqual([true, false])
    expect(deps.spawnDetached).toHaveBeenCalledOnce()
  })

  it('does not install a download that changed on disk since it was checked', async () => {
    const { forkUpdater, deps, statuses } = updater()
    await forkUpdater.check(false)
    writeFileSync(join(deps.workDir, 'update.zip'), 'tampered')
    expect(await forkUpdater.install()).toBe(false)
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
    expect(deps.quit).not.toHaveBeenCalled()
  })

  it('does not quit when Orca cannot replace its own app (for example run from Downloads)', async () => {
    const { forkUpdater, deps, statuses } = updater({
      checkAppReplaceable: async () => 'Move Orca to Applications'
    })
    await forkUpdater.check(false)
    expect(await forkUpdater.install()).toBe(false)
    expect(statuses.at(-1)).toMatchObject({ state: 'error', message: 'Move Orca to Applications' })
    expect(deps.quit).not.toHaveBeenCalled()
  })

  it("runs Orca's pre-update cleanup before quitting", async () => {
    const order: string[] = []
    const { forkUpdater } = updater({
      beforeQuit: vi.fn(async () => void order.push('cleanup')),
      quit: vi.fn(() => void order.push('quit'))
    })
    await forkUpdater.check(false)
    await forkUpdater.install()
    expect(order).toEqual(['cleanup', 'quit'])
  })

  it('records a clean start where the swap looks for it', async () => {
    const { forkUpdater, deps } = updater({ currentTag: 'v1.4.268-angelo.6' })
    await forkUpdater.markLaunched()
    expect(readFileSync(join(deps.workDir, 'launched'), 'utf8')).toBe('v1.4.268-angelo.6')
  })

  it('runs the Windows installer silently into the running folder once Orca exits', async () => {
    const { forkUpdater, deps, atExit } = updater({
      platform: 'win32',
      fetch: release({ installer: 'orca-windows-setup.exe' }),
      windowsInstallDirectory: () => 'D:\\Apps\\Orca'
    })
    await forkUpdater.check(false)
    expect(await forkUpdater.install()).toBe(true)
    expect(deps.spawnDetached).not.toHaveBeenCalled()
    atExit.forEach((listener) => listener())
    const [command, args] = vi.mocked(deps.spawnDetached).mock.calls[0]
    expect(command.endsWith('orca-windows-setup.exe')).toBe(true)
    expect(args).toEqual(['--updated', '/S', '--force-run', '/D=D:\\Apps\\Orca'])
  })
})
