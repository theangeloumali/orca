// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { RepoHostTarget } from '../../../../../../shared/repository/repo-host-identity'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { ClientGroupingSheet } from './ClientGroupingSheet'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function project(id: string, client = 'ZKidz'): Repo {
  return {
    id,
    path: `/Users/me/Work/${client}/${id}`,
    displayName: id,
    badgeColor: '#000',
    addedAt: 0
  }
}

const calls: string[] = []
async function createGroup(name: string): Promise<ProjectGroup> {
  calls.push(`create:${name}`)
  return {
    id: `g-${name}`,
    name,
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}
const createProjectGroup = vi.fn(createGroup)
const moveProjectToGroup = vi.fn(async (entry: RepoHostTarget, groupId: string | null) => {
  calls.push(`move:${entry.id}->${groupId}`)
  return true
})

function openSheet(repos: Repo[]): void {
  useAppStore.setState({
    repos,
    projectGroups: [],
    clientGroupingSheetOpen: true,
    createProjectGroup,
    moveProjectToGroup
  })
  render(<ClientGroupingSheet />)
}

describe('ClientGroupingSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
  })
  afterEach(cleanup)

  it('starts with every suggestion ticked and names the apply count', () => {
    openSheet([project('orca'), project('aicc'), project('site', 'Acme'), project('app', 'Acme')])
    expect(screen.getByRole('checkbox', { name: /ZKidz/ }).getAttribute('aria-checked')).toBe(
      'true'
    )
    expect(screen.getByText('4 projects will be filed')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Apply 2 groups' })).toBeTruthy()
  })

  it('marks a group indeterminate when only some of its projects are ticked', () => {
    openSheet([project('orca'), project('aicc'), project('web')])
    fireEvent.click(screen.getByRole('checkbox', { name: /aicc/ }))
    expect(screen.getByRole('checkbox', { name: /ZKidz/ }).getAttribute('aria-checked')).toBe(
      'mixed'
    )
    // A mixed group ticks everything back on.
    fireEvent.click(screen.getByRole('checkbox', { name: /ZKidz/ }))
    expect(screen.getByText('3 projects will be filed')).toBeTruthy()
  })

  it('creates the group, then moves only the ticked projects into it', async () => {
    openSheet([project('orca'), project('aicc'), project('web')])
    fireEvent.click(screen.getByRole('checkbox', { name: /aicc/ }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply 1 group' }))
    })
    expect(calls).toEqual(['create:ZKidz', 'move:orca->g-ZKidz', 'move:web->g-ZKidz'])
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().clientGroupingSheetOpen).toBe(false)
  })

  it('toasts the projects already filed, then the error, when apply throws partway', async () => {
    const order: string[] = []
    vi.mocked(toast.success).mockImplementation((message) => {
      order.push(`success:${String(message)}`)
      return 1
    })
    vi.mocked(toast.error).mockImplementation((message) => {
      order.push(`error:${String(message)}`)
      return 1
    })
    createProjectGroup
      .mockImplementationOnce(createGroup)
      .mockRejectedValueOnce(new Error('offline'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    openSheet([project('orca'), project('aicc'), project('site', 'Acme'), project('app', 'Acme')])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply 2 groups' }))
    })
    expect(order).toEqual([
      'success:Filed 2 projects by client',
      'error:Could not apply client groups'
    ])
    consoleError.mockRestore()
  })

  it('skips projects grouped, hidden or removed after the sheet opened', async () => {
    openSheet([project('orca'), project('aicc'), project('site'), project('web')])
    useAppStore.setState({
      repos: [
        project('orca'),
        { ...project('aicc'), projectGroupId: 'elsewhere' },
        { ...project('site'), hiddenAt: 1 }
      ]
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply 1 group' }))
    })
    expect(calls).toEqual(['create:ZKidz', 'move:orca->g-ZKidz'])
    expect(toast.success).toHaveBeenCalledWith('Filed 1 project by client', {
      description: 'Skipped 3 projects that were grouped, hidden or removed'
    })
  })

  it('skips an existing target group deleted after the sheet opened', async () => {
    const acme = { ...(await createGroup('Acme')), id: 'g-acme' }
    calls.length = 0
    useAppStore.setState({ projectGroups: [acme] })
    useAppStore.setState({
      repos: [project('app', 'Acme')],
      clientGroupingSheetOpen: true,
      createProjectGroup,
      moveProjectToGroup
    })
    render(<ClientGroupingSheet />)
    useAppStore.setState({ projectGroups: [] })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply 1 group' }))
    })
    expect(calls).toEqual([])
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('Skipped 1 project that was grouped, hidden or removed')
  })

  it("labels each client's project list as a group named after the client", () => {
    openSheet([project('orca'), project('aicc')])
    const list = screen.getByRole('group', { name: 'ZKidz' })
    expect(list.querySelectorAll('li')).toHaveLength(2)
  })

  it('moves nothing and disables Apply when every project is unticked', () => {
    openSheet([project('orca'), project('aicc')])
    fireEvent.click(screen.getByRole('checkbox', { name: /ZKidz/ }))
    const apply = screen.getByRole('button', { name: 'Apply 0 groups' })
    expect(apply.hasAttribute('disabled')).toBe(true)
    expect(createProjectGroup).not.toHaveBeenCalled()
  })

  it('says so when there is nothing to suggest', () => {
    openSheet([project('solo')])
    expect(screen.getByText('Nothing to suggest: every project is already grouped.')).toBeTruthy()
  })
})
