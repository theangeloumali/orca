import type { JSX } from 'react'
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
import { clientGroupRepoIds, findActiveClientGroupId } from './sidebar-quick-filter-chips'

const ANY_CLIENT = ''

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
  const clients = projectGroups.filter((group) => group.parentGroupId === null)
  if (clients.length === 0) {
    return null
  }
  const activeClientId = findActiveClientGroupId(filterRepoIds, projectGroups, repos)
  const activeClient = clients.find((client) => client.id === activeClientId)
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
          onValueChange={(clientId) =>
            setFilterRepoIds(
              clientId === ANY_CLIENT ? [] : clientGroupRepoIds(clientId, projectGroups, repos)
            )
          }
        >
          <DropdownMenuRadioItem value={ANY_CLIENT}>
            {t('auto.components.sidebar.quickFilters.anyClient', 'Every client')}
          </DropdownMenuRadioItem>
          {clients.map((client) => (
            <DropdownMenuRadioItem key={client.id} value={client.id}>
              <span className="truncate">{client.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
