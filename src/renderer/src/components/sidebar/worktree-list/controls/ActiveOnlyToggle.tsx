import { Activity } from 'lucide-react'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ActiveOnlyToggle() {
  const t = useTranslate()
  const active = useAppStore((s) => s.showOnlyRunningTerminals)
  const setActive = useAppStore((s) => s.setShowOnlyRunningTerminals)
  const tooltip = active
    ? t('auto.components.sidebar.activeOnly.tooltipOn', 'Show all projects')
    : t(
        'auto.components.sidebar.activeOnly.tooltipOff',
        'Show only workspaces with a running terminal'
      )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          // Filled while on, so a narrowed list is never mistaken for the whole one.
          variant={active ? 'secondary' : 'muted-field-icon'}
          size="icon-xs"
          aria-label={t('auto.components.sidebar.activeOnly.label', 'Active only')}
          aria-pressed={active}
          onClick={() => setActive(!active)}
        >
          <Activity className="size-3" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
