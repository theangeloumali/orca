import { describe, expect, it } from 'vitest'
import { getEmptyProjectPlaceholderRepoIds } from './empty-project-placeholder-repos'
import { NO_HIDDEN_PROJECTS } from '../../project/catalog/hidden-projects'
import type { Repo } from '../../repository/repo-types'

const repo: Repo = {
  id: 'repo-empty',
  path: '/repo-empty',
  displayName: 'Empty',
  badgeColor: '#000000',
  addedAt: 0
}

function placeholders(hideEmptyProjects: boolean): string[] {
  return [
    ...getEmptyProjectPlaceholderRepoIds({
      groupBy: 'repo',
      repos: [repo],
      worktreesByRepo: {},
      visibleWorktrees: [],
      filterRepoIds: [],
      hiddenProjects: NO_HIDDEN_PROJECTS,
      hideEmptyProjects
    })
  ]
}

describe('getEmptyProjectPlaceholderRepoIds hideEmptyProjects', () => {
  it('lists no placeholder while Active only hides empty projects', () => {
    expect(placeholders(true)).toEqual([])
  })

  it('keeps the placeholder otherwise', () => {
    expect(placeholders(false)).toEqual(['repo-empty'])
  })
})
