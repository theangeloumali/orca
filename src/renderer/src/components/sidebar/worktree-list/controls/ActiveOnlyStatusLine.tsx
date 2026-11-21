import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { useActiveOnlySummary } from './use-active-only-project-summary'

/** Mounted only while Active only is on, so its 30s clock never runs otherwise. */
export function ActiveOnlyStatusLine() {
  const t = useTranslate()
  const groupBy = useAppStore((s) => s.groupBy)
  const setShowOnlyRunningTerminals = useAppStore((s) => s.setShowOnlyRunningTerminals)
  const summary = useActiveOnlySummary()
  const status =
    groupBy === 'repo'
      ? t('auto.components.sidebar.activeOnly.status', 'Showing {{shown}} of {{total}} projects', {
          shown: summary.shownProjects,
          total: summary.totalProjects
        })
      : t(
          'auto.components.sidebar.activeOnly.statusWorkspaces',
          'Showing {{shown}} of {{total}} workspaces',
          { shown: summary.shownWorkspaces, total: summary.totalWorkspaces }
        )
  return (
    <p className="flex flex-wrap items-center gap-x-1 px-3 pb-1 text-[11px] tabular-nums text-muted-foreground">
      <span>{status}</span>
      {summary.hiddenNeedsYouCount > 0 && (
        <span className="text-foreground">
          <span aria-hidden="true">· </span>
          {t('auto.components.sidebar.activeOnly.hiddenNeedsYou', '{{count}} hidden need you', {
            count: summary.hiddenNeedsYouCount,
            defaultValue_one: '{{count}} hidden needs you'
          })}
        </span>
      )}
      <span aria-hidden="true">·</span>
      {/* Positioned like the header's actions so a fold target can never cover it. */}
      <span className="relative" data-sidebar-header-actions="">
        <Button
          type="button"
          variant="link-muted"
          size="inlineText"
          onClick={() => setShowOnlyRunningTerminals(false)}
        >
          {t('auto.components.sidebar.activeOnly.showAll', 'Show all')}
        </Button>
      </span>
    </p>
  )
}
