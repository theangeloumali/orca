import { getLogicalRepoOrderRankById } from '../../../../../../shared/sidebar-list/sections/project-section-order'
import { getEffectiveProjectGroupManualRank } from '../../../../../../shared/project/groups/project-groups'
import { getRepoExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { isSameRepoRow } from '@/store/repos/repo-host-identity'
import { findHeaderInNestBand, type ProjectGroupNestTarget } from './project-group-header-nest-drop'
import type { ProjectGroupHeaderDragRect } from './project-group-header-drop'
import {
  computeProjectHeaderDropPreview,
  getProjectGroupOrderForSidebarDrop
} from './project-header-drop'
import type { ProjectHeaderDragSession, RepoDrop } from './project-header-drag-contract'
import type { Repo } from '../../../../../../shared/repository/repo-types'

export type NestableProject = Pick<
  Repo,
  'id' | 'projectGroupId' | 'projectGroupOrder' | 'connectionId' | 'executionHostId'
>

/** The group a dragged project would be filed into, or null when the pointer is not over a valid one. */
export function findProjectHeaderNestTarget(args: {
  pointerContentY: number
  rects: readonly Pick<ProjectGroupHeaderDragRect, 'groupId' | 'top' | 'bottom'>[]
  project: NestableProject
  /** null marks an id two machines share: it has no single owner to file into. */
  ownerHostIdById: ReadonlyMap<string, string | null>
}): ProjectGroupNestTarget | null {
  const rect = findHeaderInNestBand(args.pointerContentY, args.rects)
  // A group lives on one machine; a project can only be filed into a group on its own.
  const valid =
    rect !== undefined &&
    args.ownerHostIdById.get(rect.groupId) === getRepoExecutionHostId(args.project) &&
    (args.project.projectGroupId ?? null) !== rect.groupId
  return valid ? { groupId: rect.groupId, top: rect.top, bottom: rect.bottom } : null
}

/** Resolves the pointer: a group header's middle band files the project, anything else reorders. */
export function computeProjectHeaderDrop(args: {
  pointerY: number
  container: {
    getBoundingClientRect: () => { top: number }
    scrollTop: number
    scrollHeight: number
  }
  session: Pick<
    ProjectHeaderDragSession,
    'registration' | 'nestRects' | 'headerRects' | 'sidebarRepoHeaderIds'
  >
  ownerHostIdById: ReadonlyMap<string, string | null>
}): RepoDrop | null {
  const { container, session } = args
  const containerTop = container.getBoundingClientRect().top
  const nestTarget = findProjectHeaderNestTarget({
    pointerContentY: args.pointerY - containerTop + container.scrollTop,
    rects: session.nestRects,
    project: session.registration,
    ownerHostIdById: args.ownerHostIdById
  })
  if (nestTarget) {
    return { dropIndex: null, dropIndicatorY: null, nestTarget }
  }
  const preview = computeProjectHeaderDropPreview({
    pointerY: args.pointerY,
    containerTop,
    scrollTop: container.scrollTop,
    rects: session.headerRects,
    sidebarRepoHeaderIds: session.sidebarRepoHeaderIds,
    contentBottom: container.scrollHeight
  })
  return preview ? { ...preview, nestTarget: null } : null
}

export function isSameNestTarget(
  left: ProjectGroupNestTarget | null,
  right: ProjectGroupNestTarget | null
): boolean {
  return (
    left === right ||
    (left?.groupId === right?.groupId && left?.top === right?.top && left?.bottom === right?.bottom)
  )
}

/** Files the live copy of the project at the end of the target group. */
export function commitProjectHeaderNestDrop<TProject extends NestableProject>(args: {
  project: TProject
  groupId: string
  liveRepos: readonly TProject[]
  orderedRepoIds: readonly string[]
  onCommitProjectGroupOrder: (project: TProject, projectGroupId: string, order: number) => void
}): void {
  const liveProject = args.liveRepos.find((repo) => isSameRepoRow(repo, args.project))
  if (!liveProject) {
    return
  }
  const hostId = getRepoExecutionHostId(liveProject)
  const repoOrderRankById = getLogicalRepoOrderRankById(args.orderedRepoIds)
  const rankOf = (repo: TProject): number =>
    getEffectiveProjectGroupManualRank(repo, repoOrderRankById)
  const siblings = args.liveRepos
    .filter(
      (repo) => repo.projectGroupId === args.groupId && getRepoExecutionHostId(repo) === hostId
    )
    .sort((left, right) => rankOf(left) - rankOf(right))
  const order = getProjectGroupOrderForSidebarDrop({
    siblings,
    dropIndex: siblings.length,
    repoOrderRankById
  })
  args.onCommitProjectGroupOrder(liveProject, args.groupId, order)
}
