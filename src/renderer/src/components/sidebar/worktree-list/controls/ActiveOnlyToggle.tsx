import { Activity } from 'lucide-react'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/class-names'

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
          variant="ghost"
          size="icon-xs"
          className={cn(
            'text-muted-foreground',
            active &&
              'bg-foreground/10 text-foreground hover:bg-foreground/15 dark:hover:bg-foreground/15'
          )}
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
