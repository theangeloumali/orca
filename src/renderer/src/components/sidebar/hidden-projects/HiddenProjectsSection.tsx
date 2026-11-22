import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useNow } from '@/lib/window-activity/use-now'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import {
  createLastActiveAtSelector,
  getIdleProjectsKey,
  groupArchivedRepos,
  IDLE_AGE_TICK_MS,
  isIdleHintDismissed,
  selectIdleListedRepos
} from './archive-model'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { ArchiveGroupSection } from './ArchiveGroupSection'
import { IdleProjectsHint } from './IdleProjectsHint'

/** Archive under the workspace list: one folded section per machine, plus the idle-projects offer. */
const HiddenProjectsSection = React.memo(function HiddenProjectsSection() {
  // Own language subscription: this memo boundary would otherwise keep the boot language.
  useTranslation()
  const repos = useAppStore((state) => state.repos)
  const now = useNow(IDLE_AGE_TICK_MS)
  const selectLastActiveAt = useMemo(() => createLastActiveAtSelector(), [])
  // Derived per-row timestamps, so workspace churn re-renders only when an answer changes.
  const lastActiveAtByRow = useAppStore(
    useShallow((state) =>
      selectLastActiveAt(
        state.repos,
        {
          workspacesByRepoId: selectWorktreesByRepo(state),
          visits: state.lastVisitedAtByWorktreeId
        },
        now
      )
    )
  )
  const dismissedIdleKey = useAppStore((state) => state.dismissedIdleProjectsKey)
  const dismissIdleProjects = useAppStore((state) => state.dismissIdleProjects)
  const archiveGroups = useMemo(() => groupArchivedRepos(repos), [repos])
  const idleListed = useMemo(
    () => selectIdleListedRepos(repos, lastActiveAtByRow, now),
    [repos, lastActiveAtByRow, now]
  )
  const idleKey = getIdleProjectsKey(idleListed)
  const idleRepos = isIdleHintDismissed(idleKey, dismissedIdleKey) ? [] : idleListed
  // Name machines only when one is not this computer; a local-only Archive needs no machine name.
  const machineLabels = useAppStore(
    useShallow((state) =>
      archiveGroups.some((group) => group.hostId !== LOCAL_EXECUTION_HOST_ID)
        ? archiveGroups.map((group) => selectExecutionHostDisplayLabel(state, group.hostId))
        : null
    )
  )
  if (archiveGroups.length === 0 && idleRepos.length === 0) {
    return null
  }

  return (
    <section
      data-testid="hidden-projects"
      className="max-h-[40%] shrink-0 overflow-y-auto border-t border-worktree-sidebar-border px-2 py-1 scrollbar-sleek"
    >
      {idleRepos.length > 0 ? (
        <IdleProjectsHint idleRepos={idleRepos} onDismiss={() => dismissIdleProjects(idleKey)} />
      ) : null}
      {archiveGroups.map((group, index) => (
        <ArchiveGroupSection
          key={group.hostId}
          repos={group.repos}
          machineLabel={machineLabels?.[index] ?? null}
          lastActiveAtByRow={lastActiveAtByRow}
        />
      ))}
    </section>
  )
})

export default HiddenProjectsSection
