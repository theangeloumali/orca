import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(), setPath: vi.fn(), setName: vi.fn(), isPackaged: false },
  crashReporter: { start: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn() }
}))

describe('shouldInstallManagedHooks', () => {
  it('installs the managed agent hooks in prod', async () => {
    const { shouldInstallManagedHooks } = await import('./configure-process')
    expect(shouldInstallManagedHooks(false, false)).toBe(true)
  })

  it('leaves ~/.orca/agent-hooks to prod in Orca Dev, whose panes reach their own hook server', async () => {
    const { shouldInstallManagedHooks } = await import('./configure-process')
    expect(shouldInstallManagedHooks(false, true)).toBe(false)
  })
})
