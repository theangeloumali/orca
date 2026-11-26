import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as Os from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const paths = vi.hoisted(() => ({ home: '', folder: '', userData: '' }))
const launcher = vi.hoisted(() => vi.fn())
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof Os>()),
  homedir: () => paths.home
}))
vi.mock('../mcp-host-list-folder', () => ({
  mcpHostListFolder: () => paths.folder
}))
vi.mock('../../../shared/app-lifecycle/app-environment', () => ({
  getAppEnvironment: () => ({
    getPath: () => paths.userData,
    isPackaged: () => false
  })
}))
vi.mock('../../cli/launchers/this-app-orca-cli-launcher', () => ({
  thisAppOrcaCliLauncher: launcher.mockImplementation(() => join(paths.userData, 'bin', 'orca'))
}))

const CURSOR_BEFORE = '{ "mcpServers": {} }\n'
let root = ''
let cursorFile = ''
let previousSwitch: string | undefined

async function startSync(devApp: boolean): Promise<() => void> {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { addMcpServers } = await import('../mcp-host-list-add')
  const { setMcpAgentFileAllowed } = await import('../mcp-host-list')
  await addMcpServers(
    [{ name: 'postgres', command: 'npx', args: ['-y', 'postgres'] }],
    { nameGiven: true },
    paths.folder
  )
  await setMcpAgentFileAllowed('cursor', true, paths.folder)
  const { startMcpAgentFileSync } = await import('./mcp-agent-file-sync')
  return startMcpAgentFileSync()
}

describe("Orca Dev and the agents' own MCP files", () => {
  beforeEach(() => {
    previousSwitch = process.env.ORCA_MCP_SERVERS
    process.env.ORCA_MCP_SERVERS = '1'
    root = mkdtempSync(join(tmpdir(), 'orca-dev-mcp-files-'))
    paths.home = join(root, 'home')
    paths.folder = join(root, 'OrcaDev', 'mcp-servers')
    paths.userData = join(root, 'OrcaDev')
    cursorFile = join(paths.home, '.cursor', 'mcp.json')
    mkdirSync(join(paths.home, '.cursor'), { recursive: true })
    writeFileSync(cursorFile, CURSOR_BEFORE)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    launcher.mockClear()
    if (previousSwitch === undefined) {
      delete process.env.ORCA_MCP_SERVERS
    } else {
      process.env.ORCA_MCP_SERVERS = previousSwitch
    }
    rmSync(root, { recursive: true, force: true })
  })

  it('leaves Cursor’s file under the home folder to prod', async () => {
    const stop = await startSync(true)
    stop()
    // The launcher lookup is the sync's first step; never reached, nothing was scheduled.
    expect(launcher).not.toHaveBeenCalled()
    expect(readFileSync(cursorFile, 'utf8')).toBe(CURSOR_BEFORE)
  })

  it('still writes the entry in prod', async () => {
    const stop = await startSync(false)
    await vi.waitFor(() => expect(readFileSync(cursorFile, 'utf8')).toContain('"postgres-orcadev-'))
    stop()
  })
})
