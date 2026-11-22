import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import type { Repo } from '../../../../../shared/repository/repo-types'
import { setProjectHidden } from './set-project-hidden'

/** One-line offer to archive every idle project at once; it only ever acts on a click. */
export function IdleProjectsHint({
  idleRepos,
  onDismiss
}: {
  idleRepos: readonly Repo[]
  onDismiss: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [archiving, setArchiving] = useState(false)
  const count = idleRepos.length
  const archiveAll = async (): Promise<void> => {
    setArchiving(true)
    // One write set, so the toast's single Undo restores every project it archived.
    const name =
      count === 1
        ? idleRepos[0].displayName
        : t('auto.components.sidebar.hiddenProjects.projectCount', '{{count}} projects', { count })
    await setProjectHidden(idleRepos, true, name)
    setArchiving(false)
  }

  return (
    <div className="flex h-7 min-w-0 items-center gap-1 rounded-md pl-1.5 text-[11px] leading-none text-muted-foreground">
      <span className="min-w-0 flex-1 truncate">
        {count === 1
          ? t('auto.components.sidebar.hiddenProjects.idleOne', '1 project idle 30+ days')
          : t(
              'auto.components.sidebar.hiddenProjects.idleMany',
              '{{count}} projects idle 30+ days',
              {
                count
              }
            )}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={archiving}
        onClick={() => void archiveAll()}
      >
        {t('auto.components.sidebar.hiddenProjects.archiveIdle', 'Archive them')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t(
          'auto.components.sidebar.hiddenProjects.dismissIdle',
          'Dismiss idle projects suggestion'
        )}
        onClick={onDismiss}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
