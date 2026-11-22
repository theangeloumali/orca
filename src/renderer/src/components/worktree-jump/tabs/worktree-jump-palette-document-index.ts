import {
  getPaletteHostBadge,
  type PaletteHostBadgeContext
} from '@/components/cmd-j/palette-host-badge'
import { getWorkspacePortsByWorktreeId } from '@/lib/workspace-ports/workspace-port-groups'
import { buildWorktreePaletteDocuments } from '@/lib/workspace/search/worktrees/worktree-palette-document'
import {
  getPaletteWorktreeIdentity,
  getPaletteWorktreeExecutionHostId,
  resolvePaletteRepoForWorktree
} from '@/lib/workspace/search/palette-repo-resolution'
import type { PaletteDocument } from '../../../../../shared/palette-match/palette-document'
import type { AppState } from '@/store/types'
import type { Repo } from '../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { WorkspacePortScanResult } from '../../../../../shared/workspace/ports/workspace-ports'
import type { HostedReviewInfo } from '../../../../../shared/source-control/hosted-review/hosted-review-contracts'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'

export function buildWorktreeJumpPaletteDocumentIndex({
  worktrees,
  repoMap,
  repoByHostIdentity,
  hostBadgeContext,
  prCache,
  issueCache,
  workspacePortScan,
  checksReviewByWorktree
}: {
  worktrees: readonly Worktree[]
  repoMap: ReadonlyMap<string, Repo>
  repoByHostIdentity: ReadonlyMap<string, Repo>
  hostBadgeContext: PaletteHostBadgeContext
  prCache: AppState['prCache'] | null
  issueCache: AppState['issueCache'] | null
  workspacePortScan: WorkspacePortScanResult | null
  checksReviewByWorktree: ReadonlyMap<Worktree, HostedReviewInfo | null>
}): Map<string, PaletteDocument> {
  const hostLabelByWorktreeId = new Map<string, string>()
  for (const worktree of worktrees) {
    const repo = resolvePaletteRepoForWorktree(worktree, repoMap, repoByHostIdentity)
    const badge = getPaletteHostBadge(
      getPaletteWorktreeExecutionHostId(worktree) ?? (repo && getRepoExecutionHostId(repo)),
      hostBadgeContext
    )
    if (badge) {
      hostLabelByWorktreeId.set(getPaletteWorktreeIdentity(worktree), badge.label)
    }
  }
  return buildWorktreePaletteDocuments(
    worktrees.filter((worktree) => !worktree.isArchived),
    {
      repoMap,
      repoMapByHostIdentity: repoByHostIdentity,
      prCache,
      issueCache,
      workspacePortsByWorktreeId: getWorkspacePortsByWorktreeId(workspacePortScan),
      checksReviewByWorktree,
      hostLabelByWorktreeId
    }
  )
}
