import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CliInstallStatus } from '../../../../../shared/cli/cli-install-types'
import { ensureOrcaCliAvailableForAgentSkillTerminal } from './agent-skill-cli-prerequisite'

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), message: vi.fn(), error: vi.fn() }
}))

const ORCA_DEV_STATUS: CliInstallStatus = {
  platform: 'darwin',
  commandName: 'orca',
  commandPath: null,
  pathDirectory: null,
  pathConfigured: false,
  launcherPath: null,
  installMethod: null,
  supported: false,
  state: 'unsupported',
  currentTarget: null,
  unsupportedReason: 'side_by_side_app',
  detail: 'Orca Dev runs beside Orca, so the orca command stays registered to Orca.'
}

describe('ensureOrcaCliAvailableForAgentSkillTerminal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('never installs the CLI when Orca Dev reports registration unsupported', async () => {
    const install = vi.fn()
    vi.stubGlobal('window', {
      api: { cli: { getInstallStatus: vi.fn(async () => ORCA_DEV_STATUS), install } }
    })

    const status = await ensureOrcaCliAvailableForAgentSkillTerminal({
      registrationPromptDelayMs: 0
    })

    expect(status).toBe(ORCA_DEV_STATUS)
    expect(install).not.toHaveBeenCalled()
  })
})
