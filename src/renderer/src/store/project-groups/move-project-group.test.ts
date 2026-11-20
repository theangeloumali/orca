import { describe, expect, it, vi } from 'vitest'
import { moveProjectGroupToParent } from './move-project-group'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

describe('moveProjectGroupToParent', () => {
  it('writes the new parent and opens it so the moved group stays visible', async () => {
    const updateProjectGroup = vi.fn().mockResolvedValue(true)
    const revealParent = vi.fn()
    const moved = await moveProjectGroupToParent({
      updateProjectGroup,
      groupId: 'dps',
      parentGroupId: 'work',
      hostId: 'local',
      revealParent
    })
    expect(moved).toBe(true)
    expect(updateProjectGroup).toHaveBeenCalledWith(
      'dps',
      { parentGroupId: 'work' },
      { hostId: 'local' }
    )
    expect(revealParent).toHaveBeenCalledWith('work')
  })

  it('leaves the old parent closed when the move is refused', async () => {
    const revealParent = vi.fn()
    const moved = await moveProjectGroupToParent({
      updateProjectGroup: vi.fn().mockResolvedValue(false),
      groupId: 'dps',
      parentGroupId: 'work',
      hostId: 'local',
      revealParent
    })
    expect(moved).toBe(false)
    expect(revealParent).not.toHaveBeenCalled()
  })
})
