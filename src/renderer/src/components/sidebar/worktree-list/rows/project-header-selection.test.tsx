// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { use } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmationDialogProvider } from '@/components/dismiss/confirmation/confirmation-dialog'
import type { HostSectionRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type {
  GroupHeaderRow,
  WorktreeGroupBy
} from '../../../../../../shared/sidebar-list/row-types'
import { ProjectHeaderSelectionScope, SelectableProjectHeader } from './project-header-selection'
import { ProjectHeaderSelectionStateContext } from './project-header-selection-context'
import {
  RepoHeaderProjectActionsMenu,
  type RepoHeaderProjectActions
} from './repo-header-project-actions'

const project = (id: string, connectionId?: string): Repo => ({
  id,
  path: `/tmp/${id}`,
  displayName: id,
  badgeColor: '#000000',
  addedAt: 0,
  connectionId
})
const alpha = project('alpha')
const beta = project('beta')
const gamma = project('gamma')
const remoteDelta = project('delta', 'gpu-vm')
const header = (repo: Repo): GroupHeaderRow => ({
  type: 'header',
  key: `repo:${repo.id}`,
  count: 1,
  icon: { kind: 'project' },
  repo
})

const localGroup: ProjectGroup = {
  id: 'infra',
  name: 'Infra',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0
}

const noopMenuActions: RepoHeaderProjectActions = {
  getWorktreeVisibilityDefaults: () => undefined,
  onOpenRepoSettings: vi.fn(),
  onOpenWorktreeVisibility: vi.fn(),
  onCreateGroupFromRepo: vi.fn(),
  onMoveProjectToGroup: vi.fn(),
  onRemoveProjectFromGroup: vi.fn(),
  onRemoveProject: vi.fn(),
  onCreateForRepo: vi.fn()
}

function SelectionProbe({
  onRender
}: {
  onRender: (keys: ReadonlySet<string>) => void
}): React.JSX.Element | null {
  onRender(use(ProjectHeaderSelectionStateContext).selectedKeys)
  return null
}

function Harness({
  projects,
  onToggle,
  groupBy = 'repo',
  setNameDialog = vi.fn(),
  menuFor,
  onSelectionRender
}: {
  projects: Repo[]
  onToggle: (id: string) => void
  groupBy?: WorktreeGroupBy
  setNameDialog?: React.ComponentProps<typeof ProjectHeaderSelectionScope>['setNameDialog']
  menuFor?: Repo
  onSelectionRender?: (keys: ReadonlySet<string>) => void
}): React.JSX.Element {
  const rows: HostSectionRow[] = projects.map(header)
  return (
    <ConfirmationDialogProvider>
      <TooltipProvider>
        <ProjectHeaderSelectionScope
          sectionRows={rows}
          groupBy={groupBy}
          setNameDialog={setNameDialog}
        >
          {projects.map((repo) => (
            <SelectableProjectHeader
              key={repo.id}
              row={header(repo)}
              label={repo.displayName}
              context={undefined}
            >
              {/* Mirrors SectionHeader: Enter and Space collapse like a click. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(repo.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onToggle(repo.id)
                  }
                }}
              >
                {repo.displayName}
              </div>
            </SelectableProjectHeader>
          ))}
          {menuFor ? (
            <RepoHeaderProjectActionsMenu
              repo={menuFor}
              label={menuFor.displayName}
              projectGroups={useAppStore.getState().projectGroups}
              actions={noopMenuActions}
            />
          ) : null}
          {onSelectionRender ? <SelectionProbe onRender={onSelectionRender} /> : null}
        </ProjectHeaderSelectionScope>
      </TooltipProvider>
    </ConfirmationDialogProvider>
  )
}

const headerFor = (name: string): HTMLElement => screen.getByRole('button', { name })
const isSelected = (name: string): boolean =>
  headerFor(name).closest('[data-project-header-selected]') !== null

describe('project header multi-select', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh')
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('toggles a header into the selection on Cmd-click without collapsing it', () => {
    const onToggle = vi.fn()
    render(<Harness projects={[alpha, beta]} onToggle={onToggle} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    expect(isSelected('alpha')).toBe(true)
    expect(isSelected('beta')).toBe(false)
    expect(onToggle).not.toHaveBeenCalled()
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    expect(isSelected('alpha')).toBe(false)
  })

  it('selects a range on Shift-click', () => {
    render(<Harness projects={[alpha, beta, gamma]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('gamma'), { shiftKey: true })
    expect([isSelected('alpha'), isSelected('beta'), isSelected('gamma')]).toEqual([
      true,
      true,
      true
    ])
  })

  it('still collapses on a plain click, and the click clears the selection', () => {
    const onToggle = vi.fn()
    render(<Harness projects={[alpha, beta]} onToggle={onToggle} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('beta'))
    expect(onToggle).toHaveBeenCalledWith('beta')
    expect(isSelected('alpha')).toBe(false)
    expect(isSelected('beta')).toBe(false)
  })

  it('clears the selection on Escape', () => {
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isSelected('alpha')).toBe(false)
  })

  it('shows the bar only while two or more projects are selected', () => {
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    expect(screen.queryByRole('button', { name: 'Group selected…' })).toBeNull()
    fireEvent.click(headerFor('beta'), { metaKey: true })
    expect(screen.getByText('2 selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(isSelected('alpha')).toBe(false)
    expect(screen.queryByText('2 selected')).toBeNull()
  })

  it('says how many projects on another machine stay put', () => {
    render(<Harness projects={[alpha, remoteDelta, beta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('delta'), { metaKey: true })
    fireEvent.click(headerFor('beta'), { metaKey: true })
    expect(screen.getByText('3 selected')).toBeTruthy()
    expect(screen.getByText('1 on another machine stays put')).toBeTruthy()
  })

  it('keeps the first-picked machine when a Shift-range pulls in other machines', () => {
    render(<Harness projects={[alpha, beta, remoteDelta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('delta'), { metaKey: true })
    fireEvent.click(headerFor('alpha'), { shiftKey: true })
    expect(screen.getByText('3 selected')).toBeTruthy()
    expect(screen.getByText('2 on another machine stay put')).toBeTruthy()
  })

  it('ignores modifier clicks when project headers are not the grouping', () => {
    const onToggle = vi.fn()
    render(<Harness projects={[alpha]} onToggle={onToggle} groupBy="workspace-status" />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    expect(onToggle).toHaveBeenCalledWith('alpha')
    expect(isSelected('alpha')).toBe(false)
  })

  it("moves only the first machine's projects into the picked group, in pick order", async () => {
    const moveProjectToGroup = vi.fn().mockResolvedValue(true)
    useAppStore.setState({ projectGroups: [localGroup], moveProjectToGroup })
    render(<Harness projects={[alpha, beta, remoteDelta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('beta'), { metaKey: true })
    fireEvent.click(headerFor('delta'), { metaKey: true })
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    openMenu(screen.getByRole('button', { name: 'Group selected…' }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Infra' }))
    await vi.waitFor(() => expect(moveProjectToGroup).toHaveBeenCalledTimes(2))
    expect(moveProjectToGroup.mock.calls.map(([repo, groupId]) => [repo.id, groupId])).toEqual([
      ['beta', 'infra'],
      ['alpha', 'infra']
    ])
    expect(isSelected('beta')).toBe(false)
  })

  it('describes a selected header as selected without making it a toggle button', () => {
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} />)
    expect(headerFor('alpha').hasAttribute('aria-pressed')).toBe(false)
    expect(headerFor('alpha').hasAttribute('aria-describedby')).toBe(false)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    const descriptionId = headerFor('alpha').getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(descriptionId)?.textContent).toBe('Selected')
    expect(headerFor('alpha').hasAttribute('aria-pressed')).toBe(false)
  })

  it('reserves the bar in flow above the top row only once two headers are picked', () => {
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} />)
    const firstHeader = headerFor('alpha').closest('.rounded-md')
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    expect(firstHeader?.previousElementSibling).toBeNull()
    fireEvent.click(headerFor('beta'), { metaKey: true })
    const bar = screen.getByText('2 selected').parentElement
    expect(firstHeader?.previousElementSibling).toBe(bar)
    expect(bar?.className.split(' ')).not.toContain('absolute')
  })

  it('toggles with Cmd+Enter and extends with Shift+Space, without collapsing', () => {
    const onToggle = vi.fn()
    render(<Harness projects={[alpha, beta, gamma]} onToggle={onToggle} />)
    fireEvent.keyDown(headerFor('alpha'), { key: 'Enter', metaKey: true })
    fireEvent.keyDown(headerFor('gamma'), { key: ' ', shiftKey: true })
    expect([isSelected('alpha'), isSelected('beta'), isSelected('gamma')]).toEqual([
      true,
      true,
      true
    ])
    expect(onToggle).not.toHaveBeenCalled()
    fireEvent.keyDown(headerFor('beta'), { key: 'Enter' })
    expect(onToggle).toHaveBeenCalledWith('beta')
    expect(isSelected('alpha')).toBe(false)
  })

  it('leaves an empty selection untouched on a plain click', () => {
    const seen: ReadonlySet<string>[] = []
    render(
      <Harness
        projects={[alpha]}
        onToggle={vi.fn()}
        onSelectionRender={(keys) => seen.push(keys)}
      />
    )
    const before = seen.at(-1)
    fireEvent.click(headerFor('alpha'))
    expect(seen.at(-1)).toBe(before)
  })

  it("groups the whole selection from a header's menu after the outside click clears it", async () => {
    const moveProjectToGroup = vi.fn().mockResolvedValue(true)
    useAppStore.setState({ projectGroups: [localGroup], moveProjectToGroup })
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} menuFor={alpha} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('beta'), { metaKey: true })
    openMenu(screen.getByRole('button', { name: 'Project actions for alpha' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Group 2 selected…' }))
    const infra = await screen.findByRole('menuitemradio', { name: 'Infra' })
    fireEvent.pointerDown(infra, { button: 0, pointerType: 'mouse' })
    expect(isSelected('alpha')).toBe(false)
    fireEvent.click(infra)
    await vi.waitFor(() => expect(moveProjectToGroup).toHaveBeenCalledTimes(2))
    expect(moveProjectToGroup.mock.calls.map(([repo]) => repo.id)).toEqual(['alpha', 'beta'])
  })

  it("keeps the bar's snapshot when pressing into its menu clears the selection", async () => {
    const moveProjectToGroup = vi.fn().mockResolvedValue(true)
    useAppStore.setState({ projectGroups: [localGroup], moveProjectToGroup })
    render(<Harness projects={[alpha, beta]} onToggle={vi.fn()} />)
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('beta'), { metaKey: true })
    openMenu(screen.getByRole('button', { name: 'Group selected…' }))
    const infra = await screen.findByRole('menuitemradio', { name: 'Infra' })
    fireEvent.pointerDown(infra, { button: 0, pointerType: 'mouse' })
    expect(isSelected('alpha')).toBe(false)
    fireEvent.click(infra)
    await vi.waitFor(() => expect(moveProjectToGroup).toHaveBeenCalledTimes(2))
  })

  it('opens the new-group dialog with the groupable projects', async () => {
    const setNameDialog = vi.fn()
    render(
      <Harness projects={[remoteDelta, alpha]} onToggle={vi.fn()} setNameDialog={setNameDialog} />
    )
    fireEvent.click(headerFor('alpha'), { metaKey: true })
    fireEvent.click(headerFor('delta'), { metaKey: true })
    openMenu(screen.getByRole('button', { name: 'Group selected…' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'New group…' }))
    expect(setNameDialog).toHaveBeenCalledWith({ type: 'create-from-repos', repos: [alpha] })
  })
})

// Radix opens menus on a primary-button pointerdown, not on click.
function openMenu(trigger: HTMLElement): void {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
}
