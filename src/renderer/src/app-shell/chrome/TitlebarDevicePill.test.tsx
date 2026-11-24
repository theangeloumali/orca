// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useAppStore } from '@/store'
import {
  repo,
  worktree
} from '@/components/sidebar/worktree-list/grouping/worktree-list-groups-test-fixtures'
import { usePublishSidebarDrawnHosts } from '@/components/sidebar/worktree-list/rows/sidebar-drawn-hosts'
import type { SidebarDrawnHosts } from '@/components/sidebar/worktree-list/rows/sidebar-drawn-hosts'
import { getDefaultSettings } from '../../../../shared/orca-profiles/constants'
import { TitlebarDevicePill } from './TitlebarDevicePill'

const hosts: SidebarDrawnHosts['hosts'] = [
  { id: 'ssh:m5', label: 'M5' },
  { id: 'ssh:m1', label: 'M1' }
]

function PillWithSidebar(): React.JSX.Element {
  usePublishSidebarDrawnHosts(hosts, 'ssh:m5')
  return <TitlebarDevicePill />
}

describe('TitlebarDevicePill', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('names the active twin machine when the workspace id repeats across machines', () => {
    useAppStore.setState({
      settings: getDefaultSettings('/home/test'),
      repos: [
        { ...repo, executionHostId: 'ssh:m5' },
        { ...repo, executionHostId: 'ssh:m1' }
      ],
      worktreesByRepo: {
        [repo.id]: [
          { ...worktree, hostId: 'ssh:m5' },
          { ...worktree, hostId: 'ssh:m1' }
        ]
      },
      activeRepoId: repo.id,
      activeWorktreeId: worktree.id,
      activeWorkspaceExecutionHostId: 'ssh:m1'
    })
    render(<PillWithSidebar />)
    expect(screen.getByText('M1')).toBeTruthy()
  })
})
