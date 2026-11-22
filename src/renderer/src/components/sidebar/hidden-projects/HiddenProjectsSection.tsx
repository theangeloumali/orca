import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useNow } from '@/lib/window-activity/use-now'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import {
  getLastActiveAtByRow,
  groupArchivedRepos,
  IDLE_AGE_TICK_MS,
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
  // Derived per-row timestamps, so workspace churn re-renders only when an answer changes.
  const lastActiveAtByRow = useAppStore(
    useShallow((state) =>
      getLastActiveAtByRow(state.repos, {
        workspacesByRepoId: selectWorktreesByRepo(state),
        visits: state.lastVisitedAtByWorktreeId
      })
    )
  )
  const [idleHintDismissed, setIdleHintDismissed] = useState(false)
  const now = useNow(IDLE_AGE_TICK_MS)
  const archiveGroups = useMemo(() => groupArchivedRepos(repos), [repos])
  const idleRepos = useMemo(
    () => (idleHintDismissed ? [] : selectIdleListedRepos(repos, lastActiveAtByRow, now)),
    [repos, lastActiveAtByRow, idleHintDismissed, now]
  )
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
        <IdleProjectsHint idleRepos={idleRepos} onDismiss={() => setIdleHintDismissed(true)} />
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
