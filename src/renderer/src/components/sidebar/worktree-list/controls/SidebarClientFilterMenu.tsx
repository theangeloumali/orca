import { useEffect, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  findActiveClientGroupId,
  followClientMembership,
  listClientChoices
} from './sidebar-quick-filter-chips'

const ANY_CLIENT = ''

// A selected client keeps matching as projects join or leave it.
function useFollowSelectedClient(): void {
  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (state.repos === previous.repos && state.projectGroups === previous.projectGroups) {
          return
        }
        const ids = followClientMembership(previous, state)
        if (ids) {
          state.setFilterRepoIds(ids)
        }
      }),
    []
  )
}

/** "Client ▾": a top-level project group narrows the list to every project beneath it. */
export function SidebarClientFilterMenu(): JSX.Element | null {
  const t = useTranslate()
  const { projectGroups, repos, filterRepoIds, setFilterRepoIds } = useAppStore(
    useShallow((s) => ({
      projectGroups: s.projectGroups,
      repos: s.repos,
      filterRepoIds: s.filterRepoIds,
      setFilterRepoIds: s.setFilterRepoIds
    }))
  )
  useFollowSelectedClient()
  const clients = listClientChoices(projectGroups, repos)
  if (clients.length === 0) {
    return null
  }
  const activeClientId = findActiveClientGroupId(filterRepoIds, projectGroups, repos)
  const activeClient = clients.find(({ group }) => group.id === activeClientId)?.group
  const emptyHint = t('auto.components.sidebar.quickFilters.emptyClient', 'No projects yet')
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={activeClient ? 'secondary' : 'ghost'}
          size="xs"
          className="max-w-28"
        >
          <span className="truncate">
            {activeClient?.name ?? t('auto.components.sidebar.quickFilters.client', 'Client')}
          </span>
          <ChevronDown className="size-3" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuRadioGroup
          value={activeClientId ?? ANY_CLIENT}
          onValueChange={(clientId) => {
            const ids = clients.find(({ group }) => group.id === clientId)?.repoIds ?? []
            // An empty client would write [], which reads as "every project".
            if (clientId === ANY_CLIENT || ids.length > 0) {
              setFilterRepoIds(ids)
            }
          }}
        >
          <DropdownMenuRadioItem value={ANY_CLIENT}>
            {t('auto.components.sidebar.quickFilters.anyClient', 'Every client')}
          </DropdownMenuRadioItem>
          {clients.map(({ group, repoIds }) => (
            <DropdownMenuRadioItem key={group.id} value={group.id} disabled={repoIds.length === 0}>
              <span className="truncate">{group.name}</span>
              {repoIds.length === 0 ? (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{emptyHint}</span>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
