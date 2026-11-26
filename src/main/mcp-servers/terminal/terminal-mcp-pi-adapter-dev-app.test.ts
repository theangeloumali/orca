import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalMcpLaunch } from './terminal-mcp-delivery'

const paths = vi.hoisted(() => ({ userData: '', piAgentDir: '' }))
vi.mock('../../../shared/app-lifecycle/app-environment', () => ({
  getAppEnvironment: () => ({ getPath: () => paths.userData, isPackaged: () => false })
}))
// Stands in for a Pi new enough for registerMcpServer.
vi.mock('./terminal-mcp-cli-support', () => ({
  terminalMcpCliSupports: async () => 'supported',
  terminalMcpCliSupportsInWsl: async () => 'supported'
}))

let root = ''

async function deliverToPi(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { pi } = await import('./terminal-mcp-pi-adapter')
  const launch: TerminalMcpLaunch = {
    servers: [],
    token: null,
    command: 'pi',
    shell: 'posix',
    env: { PI_CODING_AGENT_DIR: paths.piAgentDir },
    cwd: undefined
  }
  return pi.deliver(launch, 'pi')
}

describe("Orca Dev and Pi's shared agent folder", () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-dev-pi-mcp-'))
    paths.userData = join(root, 'OrcaDev')
    paths.piAgentDir = join(root, 'home', '.pi', 'agent')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    rmSync(root, { recursive: true, force: true })
  })

  it("hands Pi the extension by path from Dev's own userData and writes nothing in Pi's folder", async () => {
    const delivery = await deliverToPi(true)
    const launchDir = join(paths.userData, 'mcp-terminal-launch')
    expect(delivery).toMatchObject({ delivered: true })
    const command = delivery.delivered ? (delivery.command ?? '') : ''
    expect(command).toMatch(/^pi '--extension' '/)
    expect(command).toContain(launchDir)
    expect(existsSync(paths.piAgentDir)).toBe(false)
  })

  it("prod still installs the extension in Pi's agent folder", async () => {
    const delivery = await deliverToPi(false)
    expect(delivery).toMatchObject({ delivered: true })
    expect(delivery.delivered && delivery.command).toBeFalsy()
    expect(existsSync(join(paths.piAgentDir, 'extensions', 'orca-mcp-servers.ts'))).toBe(true)
  })
})
