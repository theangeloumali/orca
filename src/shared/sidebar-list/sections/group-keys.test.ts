import { describe, expect, it } from 'vitest'
import {
  UNGROUPED_PROJECT_GROUP_KEY,
  getProjectGroupHeaderKey,
  parseProjectGroupHeaderKey
} from './group-keys'

describe('parseProjectGroupHeaderKey', () => {
  it('inverts getProjectGroupHeaderKey for a group', () => {
    expect(parseProjectGroupHeaderKey(getProjectGroupHeaderKey('work'))).toEqual({
      groupId: 'work'
    })
  })

  it('reads Ungrouped as a group header with no id', () => {
    expect(parseProjectGroupHeaderKey(UNGROUPED_PROJECT_GROUP_KEY)).toEqual({ groupId: null })
  })

  it('rejects keys of other headers', () => {
    expect(parseProjectGroupHeaderKey('project:api')).toBeNull()
    expect(parseProjectGroupHeaderKey('repo:api')).toBeNull()
  })
})
