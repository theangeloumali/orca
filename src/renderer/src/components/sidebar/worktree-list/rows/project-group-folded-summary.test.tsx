// @vitest-environment happy-dom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { repo } from '../grouping/worktree-list-groups-test-fixtures'
import { getProjectGroupHeaderKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type * as ActivityCountsModule from './use-project-group-agent-activity-counts'
import type * as SidebarGroupingModule from '../listing/sidebar-project-grouping'
import { ProjectGroupFoldedSummary } from './project-group-header-actions'

const activity = vi.hoisted(() => ({ working: 0, needsYou: 1 }))
const grouping = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../listing/sidebar-project-grouping', async (importOriginal) => {
  const actual = await importOriginal<typeof SidebarGroupingModule>()
  return {
    ...actual,
    getSidebarProjectGrouping: (
      ...args: Parameters<typeof actual.getSidebarProjectGrouping>
    ): ReturnType<typeof actual.getSidebarProjectGrouping> => {
      grouping.calls += 1
      return actual.getSidebarProjectGrouping(...args)
    }
  }
})
vi.mock('./use-project-group-agent-activity-counts', async (importOriginal) => {
  const actual = await importOriginal<typeof ActivityCountsModule>()
  return { ...actual, useProjectGroupAgentActivityCounts: () => activity }
})

function group(id: string, parentGroupId: string | null): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}

describe('ProjectGroupFoldedSummary', () => {
  beforeEach(() => {
    activity.needsYou = 1
    useAppStore.setState({
      projectGroups: [group('client', null), group('nested', 'client')],
      repos: [
        { ...repo, id: 'r-top', projectGroupId: 'client' },
        { ...repo, id: 'r-nested', projectGroupId: 'nested' },
        { ...repo, id: 'r-hidden', projectGroupId: 'nested', hiddenAt: 1 }
      ],
      collapsedGroups: new Set([getProjectGroupHeaderKey('client')])
    })
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('summarises a folded group with the needs-you count in the attention colour', () => {
    render(<ProjectGroupFoldedSummary groupId="client" />)
    expect(screen.getByText('2 projects, 1 needs you')).toBeTruthy()
    const needsYou = screen.getByText('1 needs you')
    expect(needsYou.className.split(' ')).toContain('text-agent-question')
  })

  it('does not recount when unrelated store state changes', () => {
    render(<ProjectGroupFoldedSummary groupId="client" />)
    const callsAfterMount = grouping.calls
    act(() => {
      useAppStore.setState({ runtimePaneTitlesByTabId: { 'tab-1': { 1: 'vim' } } })
    })
    expect(grouping.calls).toBe(callsAfterMount)
  })

  it('leaves the needs-you part out when nothing waits', () => {
    activity.needsYou = 0
    render(<ProjectGroupFoldedSummary groupId="client" />)
    expect(screen.getByText('2 projects')).toBeTruthy()
    expect(screen.queryByText(/needs you/)).toBeNull()
  })

  it('shows nothing while the group is expanded', () => {
    useAppStore.setState({ collapsedGroups: new Set() })
    const { container } = render(<ProjectGroupFoldedSummary groupId="client" />)
    expect(container.textContent).toBe('')
  })
})
