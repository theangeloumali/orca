import { describe, expect, it, vi } from 'vitest'
import type { SleepingAgentSessionRecord } from '../../../../../../shared/agent-session/lifecycle/agent-session-resume'
import { holdImportedProdResume, resumesOnlyOnClick } from './imported-prod-resume-hold'

function startupFor(importedFromProd: boolean) {
  const record: SleepingAgentSessionRecord = {
    paneKey: 'tab-1:leaf-1',
    tabId: 'tab-1',
    worktreeId: 'wt-1::/repo',
    agent: 'claude',
    providerSession: { key: 'session_id', id: 'prod-session' },
    prompt: '',
    state: 'done',
    capturedAt: 1,
    updatedAt: 1,
    origin: 'worktree-sleep',
    restoreOnTabOpenOnly: true,
    ...(importedFromProd ? { importedFromProd } : {})
  }
  return {
    command: 'claude --resume prod-session',
    sleepingRecordEntry: { paneKey: record.paneKey, record }
  }
}

describe('holdImportedProdResume', () => {
  it('holds a visible pane imported from prod asleep until the user clicks it', () => {
    const enterSleep = vi.fn()
    const startup = startupFor(true)
    const options = { forceBlankRestoredViewport: true }

    expect(holdImportedProdResume(startup, options, enterSleep)).toBe(true)
    // Visible, so no reveal resumes it either.
    expect(enterSleep).toHaveBeenCalledWith('imported', startup, options, true)
  })

  it('lets a pane created in Dev resume on its own', () => {
    const enterSleep = vi.fn()

    expect(holdImportedProdResume(startupFor(false), {}, enterSleep)).toBe(false)
    expect(holdImportedProdResume(null, {}, enterSleep)).toBe(false)
    expect(enterSleep).not.toHaveBeenCalled()
  })
})

describe('resumesOnlyOnClick', () => {
  it('keeps an imported pane from background retries and reveals, unlike a host deferral', () => {
    expect(resumesOnlyOnClick('imported')).toBe(true)
    expect(resumesOnlyOnClick('deadline')).toBe(false)
    expect(resumesOnlyOnClick('paused')).toBe(false)
  })
})
