import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useListMultiSelection } from '@/lib/list-interaction/use-list-multi-selection'
import { getSelectionIntent } from '@/lib/list-interaction/list-multi-selection'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import { useAppStore } from '@/store'
import type { HostSectionRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { WorktreeGroupBy } from '../../../../../../shared/sidebar-list/row-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { isRepoHeaderActionTarget } from '../drag/project-header-drag-contract'
import { moveReposToGroup, splitSelectionByMachine } from './project-group-batch'
import type {
  ProjectHeaderSelectionActions,
  ProjectHeaderSelectionState
} from './project-header-selection-context'
import type { ProjectGroupNameDialogState } from './use-project-group-dialogs'

const NO_REPOS: Repo[] = []

// Every project header, inside a group or not, in render order so Shift-click ranges follow the list.
function collectSelectableHeaderRepos(rows: readonly HostSectionRow[]): Repo[] {
  return rows.flatMap((row) =>
    row.type === 'header' && row.repo && !row.projectGroup ? [row.repo] : []
  )
}

// A Shift-range rebuilds the Set in list order; earlier picks stay first so the first machine holds.
function keepPickOrder(
  previousOrder: readonly string[],
  selectedKeys: ReadonlySet<string>
): string[] {
  const kept = previousOrder.filter((key) => selectedKeys.has(key))
  const keptKeys = new Set(kept)
  return [...kept, ...[...selectedKeys].filter((key) => !keptKeys.has(key))]
}

function sameMachineOnly(repos: readonly Repo[]): Repo[] {
  return splitSelectionByMachine(repos)?.groupable ?? []
}

export function useProjectHeaderSelection(args: {
  sectionRows: readonly HostSectionRow[]
  groupBy: WorktreeGroupBy
  setNameDialog: (state: ProjectGroupNameDialogState) => void
}): {
  scopeRef: React.RefObject<HTMLDivElement | null>
  actions: ProjectHeaderSelectionActions
  state: ProjectHeaderSelectionState
} {
  const { sectionRows, groupBy, setNameDialog } = args
  const scopeRef = useRef<HTMLDivElement | null>(null)
  const items = useMemo(
    () => (groupBy === 'repo' ? collectSelectableHeaderRepos(sectionRows) : NO_REPOS),
    [groupBy, sectionRows]
  )
  const getScope = useCallback(() => scopeRef.current, [])
  const selection = useListMultiSelection<Repo>({ items, getKey: getRepoRowIdentity, getScope })
  const { selectedKeys, getItemForKey } = selection
  const [pickOrder, setPickOrder] = useState({ forKeys: selectedKeys, order: [...selectedKeys] })
  let { order } = pickOrder
  if (pickOrder.forKeys !== selectedKeys) {
    order = keepPickOrder(pickOrder.order, selectedKeys)
    setPickOrder({ forKeys: selectedKeys, order })
  }
  const selectedRepos = useMemo(
    () =>
      order.flatMap((key) => {
        const repo = getItemForKey(key)
        return repo ? [repo] : []
      }),
    [getItemForKey, order]
  )
  const selectable = items.length > 0
  const state = useMemo(
    () => ({ selectedKeys, selectedRepos, selectable }),
    [selectable, selectedKeys, selectedRepos]
  )

  // Read through a ref so the actions context stays stable across selection and row changes.
  const latestRef = useRef({ selection, selectedRepos, setNameDialog })
  useLayoutEffect(() => {
    latestRef.current = { selection, selectedRepos, setNameDialog }
  })

  const hasSelection = selectedKeys.size > 0
  useEffect(() => {
    if (!hasSelection) {
      return
    }
    const clearOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        latestRef.current.selection.setAllSelected(false)
      }
    }
    document.addEventListener('keydown', clearOnEscape)
    return () => document.removeEventListener('keydown', clearOnEscape)
  }, [hasSelection])

  const actions = useMemo<ProjectHeaderSelectionActions>(() => {
    const clearSelection = (): void => latestRef.current.selection.setAllSelected(false)
    return {
      clearSelection,
      handleHeaderGestureCapture: (event, repo) => {
        if ('key' in event && event.key !== 'Enter' && event.key !== ' ') {
          return
        }
        const { target, currentTarget } = event
        // Portaled menus bubble through the header in React; only clicks on the header itself count.
        if (
          !(target instanceof Node) ||
          !currentTarget.contains(target) ||
          isRepoHeaderActionTarget(target, currentTarget)
        ) {
          return
        }
        const { selection } = latestRef.current
        if (!selection.getItemForKey(getRepoRowIdentity(repo))) {
          return
        }
        // A plain gesture only clears; with nothing selected it must not churn a new Set.
        if (getSelectionIntent(event, navigator.userAgent.includes('Mac')) === 'replace') {
          if (selection.selectedKeys.size > 0) {
            clearSelection()
          }
          return
        }
        selection.updateSelectionForGesture(event, repo)
        event.preventDefault()
        event.stopPropagation()
      },
      getMenuSelection: (repo) => {
        const latest = latestRef.current
        return latest.selection.selectedKeys.has(getRepoRowIdentity(repo)) &&
          latest.selectedRepos.length > 1
          ? latest.selectedRepos
          : null
      },
      groupInto: (repos, groupId) => {
        const { moveProjectToGroup } = useAppStore.getState()
        void moveReposToGroup(sameMachineOnly(repos), groupId, moveProjectToGroup)
        clearSelection()
      },
      createGroupFrom: (repos) => {
        latestRef.current.setNameDialog({
          type: 'create-from-repos',
          repos: sameMachineOnly(repos)
        })
        clearSelection()
      }
    }
  }, [])

  return { scopeRef, actions, state }
}
