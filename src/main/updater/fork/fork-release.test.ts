import { describe, expect, it } from 'vitest'
import { isNewerForkRelease, parseSha512Sums, pickForkReleaseAsset } from './fork-release'

describe('isNewerForkRelease', () => {
  it('offers a newer Orca version, or the same version rebuilt by a later run', () => {
    expect(isNewerForkRelease('v1.4.266-angelo.2', 'v1.4.268-angelo.6')).toBe(true)
    expect(isNewerForkRelease('v1.4.268-angelo.6', 'v1.4.268-angelo.9')).toBe(true)
  })

  it('never offers the same, an older, or an unreadable release', () => {
    expect(isNewerForkRelease('v1.4.268-angelo.6', 'v1.4.268-angelo.6')).toBe(false)
    expect(isNewerForkRelease('v1.4.268-angelo.6', 'v1.4.267-angelo.9')).toBe(false)
    expect(isNewerForkRelease('v1.4.268-angelo.6', 'v1.4.270')).toBe(false)
  })

  it('never offers anything to a build without a baked fork tag (dev and local builds)', () => {
    expect(isNewerForkRelease(null, 'v1.4.268-angelo.6')).toBe(false)
  })
})

describe('pickForkReleaseAsset', () => {
  const assets = [
    { name: 'Orca-1.4.268-arm64-mac.zip', url: 'https://x/zip', size: 1 },
    { name: 'orca-macos-arm64.dmg', url: 'https://x/dmg', size: 1 },
    { name: 'orca-windows-setup.exe', url: 'https://x/exe', size: 1 }
  ]

  it('takes the Apple Silicon zip on macOS and the setup on Windows', () => {
    expect(pickForkReleaseAsset(assets, 'darwin')?.name).toBe('Orca-1.4.268-arm64-mac.zip')
    expect(pickForkReleaseAsset(assets, 'win32')?.name).toBe('orca-windows-setup.exe')
    expect(pickForkReleaseAsset(assets, 'linux')).toBeNull()
  })
})

describe('parseSha512Sums', () => {
  it('reads shasum -a 512 output by file name', () => {
    const sums = parseSha512Sums(
      'abc123  Orca-1.4.268-arm64-mac.zip\ndef456 *orca-windows-setup.exe\n\n'
    )
    expect([...sums]).toEqual([
      ['Orca-1.4.268-arm64-mac.zip', 'abc123'],
      ['orca-windows-setup.exe', 'def456']
    ])
  })
})
