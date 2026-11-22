import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { isIdleHintDismissed } from '../../hidden-projects/archive-model'
import { getSuggestionsKey, useClientSuggestions } from './use-client-suggestions'

const MIN_HINT_GROUP_SIZE = 3

/** One-line offer under a machine header to review client groups; it only opens the sheet. */
export function ClientGroupingHint({
  hostId
}: {
  hostId: ExecutionHostId
}): React.JSX.Element | null {
  const t = useTranslate()
  const section = useClientSuggestions().find((entry) => entry.hostId === hostId)
  const dismissedKey = useAppStore((state) => state.dismissedClientSuggestionsKey)
  const dismiss = useAppStore((state) => state.dismissClientSuggestions)
  const openSheet = useAppStore((state) => state.setClientGroupingSheetOpen)
  if (
    !section ||
    !section.suggestions.some((suggestion) => suggestion.projects.length >= MIN_HINT_GROUP_SIZE)
  ) {
    return null
  }
  const suggestionsKey = getSuggestionsKey(section)
  if (isIdleHintDismissed(suggestionsKey, dismissedKey)) {
    return null
  }
  const count = section.suggestions.reduce((total, entry) => total + entry.projects.length, 0)

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
              count,
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
        onClick={() => dismiss(suggestionsKey)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
