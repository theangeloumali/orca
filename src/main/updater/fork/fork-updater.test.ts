import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { ForkUpdater, type ForkUpdaterDeps } from './fork-updater'

const ZIP = Buffer.from('orca-1.4.268-arm64-zip-bytes')
const zipName = 'Orca-1.4.268-arm64-mac.zip'
const asBody = (value: Buffer | string) =>
  typeof value === 'string' ? value : new Uint8Array(value)

function release(tag: string, checksum = createHash('sha512').update(ZIP).digest('hex')) {
  const files: Record<string, Buffer | string> = {
    [zipName]: ZIP,
    'fork-sha512sums.txt': `${checksum}  ${zipName}\n`
  }
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/releases/latest')) {
      return Response.json({
        tag_name: tag,
        assets: Object.keys(files).map((name) => ({
          name,
          browser_download_url: `https://download/${name}`,
          size: Buffer.byteLength(files[name])
        }))
      })
    }
    const name = url.slice('https://download/'.length)
    return new Response(asBody(files[name]), {
      headers: { 'content-length': String(Buffer.byteLength(files[name])) }
    })
  })
  return fetch
}

function updater(overrides: Partial<ForkUpdaterDeps>) {
  const statuses: UpdateStatus[] = []
  const deps: ForkUpdaterDeps = {
    currentTag: 'v1.4.266-angelo.2',
    platform: 'darwin',
    appPath: '/Applications/Orca.app',
    workDir: mkdtempSync(join(tmpdir(), 'orca-fork-update-')),
    pid: 4242,
    fetch: release('v1.4.268-angelo.6'),
    extractMacApp: vi.fn(async (_zip: string, destination: string) =>
      join(destination, 'Orca.app')
    ),
    spawnDetached: vi.fn(),
    quit: vi.fn(),
    publish: (status) => statuses.push(status),
    ...overrides
  }
  return { forkUpdater: new ForkUpdater(deps), deps, statuses }
}

describe('ForkUpdater', () => {
  it('offers a newer fork release, downloads it and has it ready to install', async () => {
    const { forkUpdater, statuses } = updater({})
    await forkUpdater.check(true)
    expect(statuses.map((status) => status.state)).toEqual([
      'checking',
      'available',
      'downloading',
      'downloaded'
    ])
    expect(statuses.at(-1)).toMatchObject({ state: 'downloaded', version: '1.4.268' })
  })

  it('refuses an installer whose checksum does not match', async () => {
    const { forkUpdater, deps, statuses } = updater({ fetch: release('v1.4.268-angelo.6', 'bad') })
    await forkUpdater.check(true)
    expect(statuses.at(-1)).toMatchObject({ state: 'error' })
    expect(deps.extractMacApp).not.toHaveBeenCalled()
  })

  it('reports up to date when this build is the latest fork release', async () => {
    const { forkUpdater, statuses } = updater({ currentTag: 'v1.4.268-angelo.6' })
    await forkUpdater.check(true)
    expect(statuses.at(-1)).toEqual({ state: 'not-available', userInitiated: true })
  })

  it('swaps the Mac app after quitting', async () => {
    const { forkUpdater, deps } = updater({})
    await forkUpdater.check(false)
    await forkUpdater.install()
    const [command, args] = vi.mocked(deps.spawnDetached).mock.calls[0]
    expect(command).toBe('/bin/sh')
    expect(readFileSync(args[0], 'utf8')).toContain("'/Applications/Orca.app'")
    expect(deps.quit).toHaveBeenCalledOnce()
  })

  it('runs the Windows installer silently after quitting', async () => {
    const files = { 'orca-windows-setup.exe': ZIP }
    const checksum = createHash('sha512').update(ZIP).digest('hex')
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('/releases/latest')
        ? Response.json({
            tag_name: 'v1.4.268-angelo.6',
            assets: [
              {
                name: 'orca-windows-setup.exe',
                browser_download_url: 'https://download/exe',
                size: ZIP.length
              },
              {
                name: 'fork-sha512sums.txt',
                browser_download_url: 'https://download/sums',
                size: 1
              }
            ]
          })
        : new Response(
            url.endsWith('/sums')
              ? `${checksum}  orca-windows-setup.exe\n`
              : files['orca-windows-setup.exe']
          )
    )
    const { forkUpdater, deps } = updater({ platform: 'win32', fetch })
    await forkUpdater.check(false)
    await forkUpdater.install()
    const [command, args] = vi.mocked(deps.spawnDetached).mock.calls[0]
    expect(command.endsWith('orca-windows-setup.exe')).toBe(true)
    expect(args).toEqual(['--updated', '/S', '--force-run'])
    expect(deps.quit).toHaveBeenCalledOnce()
  })
})
