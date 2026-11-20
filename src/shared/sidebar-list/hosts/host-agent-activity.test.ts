import { describe, expect, it } from 'vitest'
import type { LiveAgentWorktreeStatus } from '../feed-facts/workspace-activity-facts'
import { countHostAgentActivity } from './host-agent-activity'

describe('countHostAgentActivity', () => {
  it('counts working and monitoring agents as working and permission prompts as needing you', () => {
    const live = new Map<string, LiveAgentWorktreeStatus>([
      ['a', 'working'],
      ['b', 'monitoring'],
      ['c', 'permission'],
      ['on-another-host', 'permission']
    ])

    expect(countHostAgentActivity(['a', 'b', 'c', 'idle'], live)).toEqual({
      working: 2,
      needsYou: 1
    })
  })
})
