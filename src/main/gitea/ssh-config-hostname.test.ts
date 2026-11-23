import { beforeEach, describe, expect, it, vi } from 'vitest'

const sshG = vi.hoisted(() => ({ runSshG: vi.fn() }))
vi.mock('../ssh/config/ssh-g-config-resolution', () => sshG)

const { lookUpSshConfigHostname, _resetSshConfigHostnameCache } =
  await import('./ssh-config-hostname')

beforeEach(() => {
  _resetSshConfigHostnameCache()
  sshG.runSshG.mockReset()
})

describe('lookUpSshConfigHostname', () => {
  it('runs ssh -G once per alias with a 2s timeout and reuses the answer', async () => {
    sshG.runSshG.mockResolvedValue({ hostname: 'git.example.test' })
    expect(await lookUpSshConfigHostname('nas', {})).toEqual({ hostname: 'git.example.test' })
    expect(await lookUpSshConfigHostname('nas', {})).toEqual({ hostname: 'git.example.test' })
    expect(sshG.runSshG.mock.calls).toEqual([[['-G', '--', 'nas'], 2000]])
  })

  it('retries after a failed probe instead of caching it', async () => {
    sshG.runSshG.mockResolvedValueOnce(null).mockResolvedValueOnce({ hostname: 'git.example.test' })
    expect(await lookUpSshConfigHostname('nas', {})).toEqual({ hostname: null })
    expect(await lookUpSshConfigHostname('nas', {})).toEqual({ hostname: 'git.example.test' })
  })

  it("does not read this machine's ssh config for WSL or SSH-target repos", async () => {
    expect(await lookUpSshConfigHostname('nas', { wslDistro: 'Ubuntu' })).toEqual({
      hostname: null
    })
    expect(await lookUpSshConfigHostname('nas', { connectionId: 'conn-1' })).toEqual({
      hostname: null
    })
    expect(sshG.runSshG).not.toHaveBeenCalled()
  })
})
