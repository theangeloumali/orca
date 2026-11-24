import { describe, expect, it } from 'vitest'
import { getSessionHighlight } from './session-highlight'

describe('session highlight', () => {
  it('highlights a working agent and a needs-you agent differently', () => {
    expect(getSessionHighlight('working')).toBe('working')
    expect(getSessionHighlight('permission')).toBe('needs-you')
  })

  it('leaves idle and done workspaces unhighlighted', () => {
    for (const status of ['active', 'inactive', 'done'] as const) {
      expect(getSessionHighlight(status)).toBeUndefined()
    }
  })
})
