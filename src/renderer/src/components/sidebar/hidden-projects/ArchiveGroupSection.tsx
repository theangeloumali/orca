import React, { useId, useState } from 'react'
import { useNow } from '@/lib/window-activity/use-now'
import { ChevronRight } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { RepoMark } from '@/components/repo/RepoMark'
import { cn } from '@/lib/class-names'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import { getIdleDays } from '../../../../../shared/project/catalog/idle-projects'
import type { Repo } from '../../../../../shared/repository/repo-types'
import { IDLE_AGE_TICK_MS } from './archive-model'
import { setProjectHidden } from './set-project-hidden'

const TOGGLE_CLASS =
  'flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-[11px] leading-none text-muted-foreground transition-colors hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-worktree-sidebar-ring'

/** One machine's folded Archive; `machineLabel` is omitted when this computer is the only one. */
export function ArchiveGroupSection({
  repos,
  machineLabel,
  lastActiveAtByRow
}: {
  repos: readonly Repo[]
  machineLabel: string | null
  lastActiveAtByRow: Readonly<Record<string, number>>
}): React.JSX.Element {
  const t = useTranslate()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set())
  const now = useNow(IDLE_AGE_TICK_MS, expanded)

  const restore = async (repo: Repo, key: string): Promise<void> => {
    setPendingKeys((previous) => new Set(previous).add(key))
    await setProjectHidden([repo], false, repo.displayName)
    setPendingKeys((previous) => {
      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }

  const title = machineLabel
    ? t(
        'auto.components.sidebar.hiddenProjects.archiveOnMachineTitle',
        'Archive · {{machine}} · {{count}}',
        {
          machine: machineLabel,
          count: repos.length
        }
      )
    : t('auto.components.sidebar.hiddenProjects.archiveTitle', 'Archive · {{count}}', {
        count: repos.length
      })

  return (
    <div data-testid="archive-group">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        onClick={() => setExpanded((value) => !value)}
        className={TOGGLE_CLASS}
      >
        <ChevronRight
          className={cn('size-3 shrink-0 transition-transform', expanded && 'rotate-90')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </button>
      {expanded ? (
        <>
          <p className="px-1.5 pb-1 pl-6 text-[11px] leading-4 text-muted-foreground">
            {t('auto.components.sidebar.hiddenProjects.archiveNote', 'Nothing is deleted.')}
          </p>
          <ul id={listId} className="flex flex-col pb-1" aria-label={title}>
            {repos.map((repo) => {
              // The full row identity: paired-server twins share id and host, differing by SSH target.
              const key = getRepoRowIdentity(repo)
              const idleDays = getIdleDays(lastActiveAtByRow[key] ?? repo.addedAt, now)
              return (
                <li
                  key={key}
                  data-testid="hidden-project"
                  className="group/hidden-project flex h-7 min-w-0 items-center gap-1.5 rounded-md pl-1.5 pr-0.5 transition-colors hover:bg-worktree-sidebar-accent focus-within:bg-worktree-sidebar-accent"
                >
                  <RepoMark repo={repo} size="md" />
                  <span className="min-w-0 flex-1 truncate text-[13px] leading-4 text-muted-foreground">
                    {repo.displayName}
                  </span>
                  <span
                    className="shrink-0 text-[10px] leading-none tabular-nums text-muted-foreground"
                    aria-label={t(
                      'auto.components.sidebar.hiddenProjects.idleAgeLabel',
                      'Idle {{count}} days',
                      {
                        count: idleDays
                      }
                    )}
                  >
                    {t('auto.components.sidebar.hiddenProjects.idleAge', '{{count}}d', {
                      count: idleDays
                    })}
                  </span>
                  {/* Revealed on row hover; focus-within keeps it visible for keyboard users. */}
                  <span className="flex shrink-0 can-hover:opacity-0 can-hover:group-hover/hidden-project:opacity-100 focus-within:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={pendingKeys.has(key)}
                      aria-label={t(
                        'auto.components.sidebar.hiddenProjects.restoreAriaLabel',
                        'Restore {{name}}',
                        {
                          name: repo.displayName
                        }
                      )}
                      onClick={() => void restore(repo, key)}
                    >
                      {t('auto.components.sidebar.hiddenProjects.restore', 'Restore')}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}
