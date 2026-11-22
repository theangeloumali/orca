import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { ClientGroupingHintRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'

/** One-line offer under a machine header to review client groups; it only opens the sheet. */
export function ClientGroupingHint({ row }: { row: ClientGroupingHintRow }): React.JSX.Element {
  const t = useTranslate()
  const dismiss = useAppStore((state) => state.dismissClientSuggestions)
  const openSheet = useAppStore((state) => state.setClientGroupingSheetOpen)

  return (
    <div className="flex h-7 min-w-0 items-center gap-1 pl-0.5 text-[11px] leading-none text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="min-w-0 flex-1 justify-start"
        onClick={() => openSheet(true)}
      >
        <span className="truncate">
          {t(
            'auto.components.sidebar.ClientGroupingHint.offer',
            'Group {{count}} ungrouped by client…',
            {
              count: row.projectCount,
              defaultValue_one: 'Group {{count}} ungrouped by client…'
            }
          )}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t(
          'auto.components.sidebar.ClientGroupingHint.dismiss',
          'Dismiss client grouping suggestion'
        )}
        onClick={() => dismiss(row.suggestionsKey)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
