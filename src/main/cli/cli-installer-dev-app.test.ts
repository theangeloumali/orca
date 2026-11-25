import { chmod, mkdir, mkdtemp, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CliInstaller } from './cli-installer'

async function writeLauncher(resourcesPath: string): Promise<string> {
  const launcherPath = join(resourcesPath, 'bin', 'orca')
  await mkdir(join(resourcesPath, 'bin'), { recursive: true })
  await writeFile(launcherPath, '#!/bin/sh\n')
  await chmod(launcherPath, 0o755)
  return launcherPath
}

describe('CliInstaller in Orca Dev', () => {
  let root: string
  let prodLauncherPath: string
  let commandPath: string
  let installer: CliInstaller

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'orca-dev-cli-'))
    prodLauncherPath = await writeLauncher(join(root, 'Orca.app', 'Contents', 'Resources'))
    const devResourcesPath = join(root, 'Orca Dev.app', 'Contents', 'Resources')
    await writeLauncher(devResourcesPath)
    commandPath = join(root, 'bin', 'orca')
    await mkdir(join(root, 'bin'))
    await symlink(prodLauncherPath, commandPath)
    installer = new CliInstaller({
      platform: 'darwin',
      isPackaged: true,
      isOrcaDevApp: true,
      userDataPath: join(root, 'OrcaDev'),
      resourcesPath: devResourcesPath,
      execPath: join(root, 'Orca Dev.app', 'Contents', 'MacOS', 'Orca Dev'),
      appPath: join(devResourcesPath, 'app.asar'),
      homePath: root,
      processPathEnv: join(root, 'bin'),
      commandPathOverride: commandPath,
      privilegedRunner: async () => {
        throw new Error('Orca Dev must not elevate')
      }
    })
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('reports registration as unsupported instead of classifying prod as stale', async () => {
    const status = await installer.getStatus()
    expect(status).toMatchObject({
      supported: false,
      state: 'unsupported',
      unsupportedReason: 'side_by_side_app',
      commandPath: null
    })
    expect(status.detail).toContain('Orca Dev')
  })

  it('rejects install() and leaves the link to Orca.app untouched', async () => {
    await expect(installer.install()).rejects.toThrow('Orca Dev')
    expect(await readlink(commandPath)).toBe(prodLauncherPath)
  })

  it('never removes the link to Orca.app', async () => {
    await installer.remove()
    expect(await readlink(commandPath)).toBe(prodLauncherPath)
  })
})
