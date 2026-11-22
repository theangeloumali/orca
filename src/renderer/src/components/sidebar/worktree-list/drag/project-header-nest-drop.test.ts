import { describe, expect, it, vi } from 'vitest'
import {
  commitProjectHeaderNestDrop,
  computeProjectHeaderDrop,
  findProjectHeaderNestTarget,
  type NestableProject
} from './project-header-nest-drop'
import { commitProjectHeaderDragDrop } from './project-header-drag-commit'
import type { ProjectHeaderDragSession } from './project-header-drag-contract'
import type { Repo } from '../../../../../../shared/repository/repo-types'

// Group headers are 30px tall; the middle band of "work" runs from 109 to 121.
const groupRects = [
  { groupId: 'work', top: 100, bottom: 130 },
  { groupId: 'm1-group', top: 140, bottom: 170 }
]
const ownerHostIdById = new Map<string, string | null>([
  ['work', 'local'],
  ['m1-group', 'runtime:m1'],
  ['shared', null]
])
const localProject: NestableProject = { id: 'orca', projectGroupId: null }

const localRepo = (id: string): Repo => ({
  id,
  path: `/${id}`,
  displayName: id,
  badgeColor: '',
  addedAt: 0
})

const find = (pointerContentY: number, project: NestableProject = localProject) =>
  findProjectHeaderNestTarget({ pointerContentY, rects: groupRects, project, ownerHostIdById })

describe('findProjectHeaderNestTarget', () => {
  it('files a project into a group when the pointer is over the middle of its header', () => {
    expect(find(115)).toEqual({ groupId: 'work', top: 100, bottom: 130 })
  })

  it('leaves the top and bottom edges of a group header to reordering', () => {
    expect(find(103)).toBeNull()
    expect(find(127)).toBeNull()
  })

  it("refuses another machine's group and a group with no single owner", () => {
    expect(find(155)).toBeNull()
    expect(
      findProjectHeaderNestTarget({
        pointerContentY: 115,
        rects: [{ groupId: 'shared', top: 100, bottom: 130 }],
        project: localProject,
        ownerHostIdById
      })
    ).toBeNull()
  })

  it("files an SSH project into this computer's groups but not a paired server's", () => {
    const sshProject: NestableProject = { id: 'api', projectGroupId: null, connectionId: 'box' }
    expect(find(115, sshProject)).toEqual({ groupId: 'work', top: 100, bottom: 130 })
    expect(find(155, sshProject)).toBeNull()
    expect(find(155, { ...localProject, executionHostId: 'runtime:m2' })).toBeNull()
  })

  it('refuses the group the project is already in', () => {
    expect(find(115, { ...localProject, projectGroupId: 'work' })).toBeNull()
  })
})

describe('computeProjectHeaderDrop', () => {
  const container = { getBoundingClientRect: () => ({ top: 0 }), scrollTop: 0, scrollHeight: 400 }
  const session = {
    registration: localRepo('orca'),
    nestRects: groupRects.map((rect, headerIndex) => ({ ...rect, bucketKey: 'root', headerIndex })),
    headerRects: [
      { repoId: 'orca', bucketKey: 'ungrouped', headerIndex: 0, top: 200, bottom: 230 },
      { repoId: 'docs', bucketKey: 'ungrouped', headerIndex: 1, top: 240, bottom: 270 }
    ],
    sidebarRepoHeaderIds: ['orca', 'docs']
  }
  const drop = (pointerY: number) =>
    computeProjectHeaderDrop({ pointerY, container, session, ownerHostIdById })

  it('shows only the ring over the middle of a group header', () => {
    expect(drop(115)).toEqual({
      dropIndex: null,
      dropIndicatorY: null,
      nestTarget: { groupId: 'work', top: 100, bottom: 130 }
    })
  })

  it('keeps reordering between project headers', () => {
    expect(drop(265)).toMatchObject({ dropIndex: 2, nestTarget: null })
  })
})

describe('commitProjectHeaderNestDrop', () => {
  it('commits the project to the end of the target group', () => {
    const onCommitProjectGroupOrder = vi.fn()
    const project: NestableProject = { id: 'orca', projectGroupId: null }
    commitProjectHeaderNestDrop({
      project,
      groupId: 'work',
      liveRepos: [
        project,
        { id: 'a', projectGroupId: 'work', projectGroupOrder: 4 },
        { id: 'b', projectGroupId: 'work', projectGroupOrder: 9 },
        { id: 'c', projectGroupId: 'work', projectGroupOrder: 50, executionHostId: 'runtime:m1' },
        { id: 'd', projectGroupId: 'films', projectGroupOrder: 70 }
      ],
      orderedRepoIds: ['orca', 'a', 'b', 'c', 'd'],
      onCommitProjectGroupOrder
    })
    expect(onCommitProjectGroupOrder).toHaveBeenCalledWith(project, 'work', 10)
  })

  it('starts an empty group at order 0', () => {
    const onCommitProjectGroupOrder = vi.fn()
    commitProjectHeaderNestDrop({
      project: localProject,
      groupId: 'work',
      liveRepos: [localProject],
      orderedRepoIds: ['orca'],
      onCommitProjectGroupOrder
    })
    expect(onCommitProjectGroupOrder).toHaveBeenCalledWith(localProject, 'work', 0)
  })

  it('skips a project that left the live list mid-drag', () => {
    const onCommitProjectGroupOrder = vi.fn()
    commitProjectHeaderNestDrop({
      project: localProject,
      groupId: 'work',
      liveRepos: [],
      orderedRepoIds: [],
      onCommitProjectGroupOrder
    })
    expect(onCommitProjectGroupOrder).not.toHaveBeenCalled()
  })
})

describe('commitProjectHeaderDragDrop reorder', () => {
  it('still reorders ungrouped projects by their edge slot', () => {
    const repos = ['a', 'b', 'c'].map(localRepo)
    const onCommitRepoOrder = vi.fn()
    const session: Pick<ProjectHeaderDragSession, 'repo' | 'bucketKey' | 'sidebarRepoHeaderIds'> = {
      repo: repos[0]!,
      bucketKey: 'ungrouped',
      sidebarRepoHeaderIds: ['a', 'b', 'c']
    }
    commitProjectHeaderDragDrop({
      session,
      sidebarDropIndex: 3,
      orderedRepoIds: ['a', 'b', 'c'],
      repoById: new Map(repos.map((repo) => [repo.id, repo])),
      liveRepos: repos,
      usesProjectGroupOrdering: false,
      onCommitRepoOrder,
      onCommitProjectGroupOrder: vi.fn()
    })
    expect(onCommitRepoOrder).toHaveBeenCalledWith(['b', 'c', 'a'])
  })
})
