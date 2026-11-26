import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listAgentMcpServers,
  moveAgentMcpServer,
  type AgentMcpImportHost
} from './agent-mcp-import'

vi.mock('../../../shared/fork/orca-dev-app-flag', () => ({
  IS_ORCA_DEV_APP: true
}))

const CURSOR_JSON = '{ "mcpServers": { "cur": { "url": "https://cur.dev/mcp" } } }'
let home = ''

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'orca-dev-mcp-move-'))
  mkdirSync(join(home, '.cursor'))
  writeFileSync(join(home, '.cursor', 'mcp.json'), CURSOR_JSON)
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('Move to Orca in Orca Dev', () => {
  it('copies the server and leaves the agent’s own file to prod', async () => {
    const host: AgentMcpImportHost = {
      context: { homeDir: home, env: {}, platform: 'darwin' },
      userDataPath: join(home, 'OrcaDev'),
      workspaceFor: async () => () => null,
      isOrcaProject: () => false,
      listReaches: async () => () => true
    }
    const row = (await listAgentMcpServers(host)).find((found) => found.name === 'cur')!
    expect(row.removesFrom).toEqual([])

    const keptCopies: boolean[] = []
    await moveAgentMcpServer(host, row.key, async (_server, _scope, keepsCopies) => {
      keptCopies.push(keepsCopies)
    })

    expect(keptCopies).toEqual([true])
    expect(readFileSync(join(home, '.cursor', 'mcp.json'), 'utf8')).toBe(CURSOR_JSON)
  })
})
