import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { useActiveOnlyProjectSummary } from './use-active-only-project-summary'

/** Mounted only while Active only is on, so its 30s clock never runs otherwise. */
export function ActiveOnlyStatusLine() {
  const t = useTranslate()
  const setShowOnlyRunningTerminals = useAppStore((s) => s.setShowOnlyRunningTerminals)
  const { shownCount, totalCount, hiddenNeedsYouCount } = useActiveOnlyProjectSummary()
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-1 px-3 pb-1 text-[11px] tabular-nums text-muted-foreground"
    >
      <span>
        {t('auto.components.sidebar.activeOnly.status', 'Showing {{shown}} of {{total}} projects', {
          shown: shownCount,
          total: totalCount
        })}
      </span>
      {hiddenNeedsYouCount > 0 && (
        <span className="text-foreground">
          <span aria-hidden="true">· </span>
          {t('auto.components.sidebar.activeOnly.hiddenNeedsYou', '{{count}} hidden need you', {
            count: hiddenNeedsYouCount
          })}
        </span>
      )}
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="rounded-sm underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => setShowOnlyRunningTerminals(false)}
      >
        {t('auto.components.sidebar.activeOnly.showAll', 'Show all')}
      </button>
    </p>
  )
}
