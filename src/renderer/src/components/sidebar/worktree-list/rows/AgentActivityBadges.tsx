import React from 'react'
import { CircleHelp, Loader2, SquareTerminal } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'

type AgentActivityBadgesProps = {
  needsYou: number
  working: number
  /** Workspaces with a live terminal; the machine header leaves it out. */
  terminals?: number
}

/** Header counts of agents waiting on you, agents working and live terminals; nothing when quiet. */
export function AgentActivityBadges({
  needsYou,
  working,
  terminals = 0
}: AgentActivityBadgesProps): React.JSX.Element | null {
  const t = useTranslate()
  if (needsYou === 0 && working === 0 && terminals === 0) {
    return null
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-3xs leading-none tabular-nums">
      {needsYou > 0 ? (
        <span
          role="img"
          className="flex items-center gap-0.5 text-agent-question"
          aria-label={t(
            'auto.components.sidebar.HostSectionHeader.agentsNeedYou',
            '{{count}} need you',
            {
              count: needsYou
            }
          )}
        >
          <CircleHelp className="size-3" aria-hidden />
          {needsYou}
        </span>
      ) : null}
      {working > 0 ? (
        <span
          role="img"
          className="flex items-center gap-0.5 text-muted-foreground"
          aria-label={t(
            'auto.components.sidebar.HostSectionHeader.agentsWorking',
            '{{count}} working',
            {
              count: working
            }
          )}
        >
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
          {working}
        </span>
      ) : null}
      {terminals > 0 ? (
        <span
          role="img"
          className="flex items-center gap-0.5 text-muted-foreground"
          aria-label={t(
            'auto.components.sidebar.AgentActivityBadges.workspacesWithTerminals',
            '{{count}} with open terminals',
            { count: terminals, defaultValue_one: '{{count}} with an open terminal' }
          )}
        >
          <SquareTerminal className="size-3" aria-hidden />
          {terminals}
        </span>
      ) : null}
    </span>
  )
}
