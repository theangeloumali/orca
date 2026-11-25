import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const roots: string[] = []

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function makeHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'orca-serve-ns-'))
  roots.push(home)
  return home
}

async function renderFor(platform: NodeJS.Platform, homeDir: string, devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { renderServeService } = await import('./serve-service-unit.js')
  const userDataPath = join(homeDir, 'user-data')
  return renderServeService({
    platform,
    homeDir,
    command: join(homeDir, 'bin', 'orca'),
    userDataPath,
    defaultUserDataPath: userDataPath,
    path: join(homeDir, 'bin')
  })
}

async function listFor(platform: NodeJS.Platform, homeDir: string, devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { listInstalledServeServiceUnits } =
    await import('../../../../shared/remote-runtime/serve-supervisor/serve-service-unit-removal.js')
  return (await listInstalledServeServiceUnits(platform, homeDir)).map((unit) => unit.name)
}

describe('orca serve service namespace in Orca Dev', () => {
  it("gives Orca Dev its own launchd label, plist and log, apart from prod's", async () => {
    const home = makeHome()
    const prod = await renderFor('darwin', home, false)
    const dev = await renderFor('darwin', home, true)

    expect(prod.name).toBe('com.stablyai.orca.serve')
    expect(dev.name).toBe('com.stablyai.orca.serve.dev')
    expect(dev.unitPath).toBe(
      join(home, 'Library', 'LaunchAgents', 'com.stablyai.orca.serve.dev.plist')
    )
    expect(dev.logPath).toBe(
      join(home, 'Library', 'Logs', 'Orca', 'com.stablyai.orca.serve.dev.log')
    )
    expect(dev.unitPath).not.toBe(prod.unitPath)
    expect(dev.content).toContain('<string>com.stablyai.orca.serve.dev</string>')
  })

  it("gives Orca Dev its own systemd unit, apart from prod's", async () => {
    const home = makeHome()
    const prod = await renderFor('linux', home, false)
    const dev = await renderFor('linux', home, true)

    expect(prod.name).toBe('orca-serve.service')
    expect(dev.name).toBe('orca-dev-serve.service')
    expect(dev.unitPath).not.toBe(prod.unitPath)
  })

  it("lists only its own build's units, so neither stops or removes the other's", async () => {
    const home = makeHome()
    const agents = join(home, 'Library', 'LaunchAgents')
    mkdirSync(agents, { recursive: true })
    for (const label of ['com.stablyai.orca.serve', 'com.stablyai.orca.serve.dev']) {
      writeFileSync(join(agents, `${label}.plist`), '')
    }

    expect(await listFor('darwin', home, false)).toEqual(['com.stablyai.orca.serve'])
    expect(await listFor('darwin', home, true)).toEqual(['com.stablyai.orca.serve.dev'])
  })
})
