import { describe, expect, it } from 'vitest'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { resolveTitlebarDeviceHostId } from './titlebar-device-host'

const twoHosts: { id: ExecutionHostId }[] = [{ id: 'local' }, { id: 'ssh:m1' }]

describe('titlebar device host', () => {
  it('follows the active workspace to its host', () => {
    const onM1 = { activeWorktreeId: 'w1', activeWorkspaceExecutionHostId: 'ssh:m1' as const }
    expect(resolveTitlebarDeviceHostId(onM1, undefined, twoHosts)).toBe('ssh:m1')
    const onLocal = { activeWorktreeId: 'w2', activeWorkspaceExecutionHostId: null }
    expect(resolveTitlebarDeviceHostId(onLocal, 'local', twoHosts)).toBe('local')
  })

  it('hides with one host, no active workspace, or an unknown host', () => {
    const onM1 = { activeWorktreeId: 'w1', activeWorkspaceExecutionHostId: 'ssh:m1' as const }
    expect(resolveTitlebarDeviceHostId(onM1, undefined, [{ id: 'ssh:m1' }])).toBeNull()
    expect(resolveTitlebarDeviceHostId({ activeWorktreeId: null }, 'local', twoHosts)).toBeNull()
    const gone = { activeWorktreeId: 'w1', activeWorkspaceExecutionHostId: 'ssh:gone' as const }
    expect(resolveTitlebarDeviceHostId(gone, undefined, twoHosts)).toBeNull()
  })
})
