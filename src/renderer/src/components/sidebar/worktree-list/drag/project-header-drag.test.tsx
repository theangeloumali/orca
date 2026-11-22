// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { useRepoHeaderDrag } from './project-header-drag'
import { canDragProjectHeader } from './project-header-drag-start'

const project = (overrides: Partial<Repo> = {}): Repo => ({
  id: 'orca',
  path: '/orca',
  displayName: 'orca',
  badgeColor: '',
  addedAt: 0,
  ...overrides
})
const localOrca = project()
const m1Orca = project({ executionHostId: 'runtime:m1' })
const ownerHostIdById = new Map<string, string | null>([
  ['work', 'local'],
  ['m1-group', 'runtime:m1']
])

type HarnessProps = {
  anchor: Repo
  registration: Repo
  liveRepos: readonly Repo[]
  usesProjectGroupOrdering?: boolean
  ownerHostIdById?: ReadonlyMap<string, string | null>
  groupId?: string
  /** Lays the group header's virtual row out here while it is drawn pinned at 100. */
  pinnedRowStart?: number
  onCommitRepoOrder?: (ids: string[]) => void
  onCommitProjectGroupOrder?: (project: Repo, groupId: string | null, order: number) => void
  onToggle?: () => void
}

function DragHarness(props: HarnessProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const drag = useRepoHeaderDrag({
    orderedRepoIds: props.liveRepos.map((repo) => repo.id),
    sidebarRepoHeaderIdsByBucket: new Map([['ungrouped', [props.anchor.id]]]),
    repoById: new Map([[props.anchor.id, props.anchor]]),
    getLiveRepos: () => props.liveRepos,
    usesProjectGroupOrdering: props.usesProjectGroupOrdering ?? true,
    onCommitRepoOrder: props.onCommitRepoOrder ?? vi.fn(),
    onCommitProjectGroupOrder: props.onCommitProjectGroupOrder ?? vi.fn(),
    onCommitRootProjectOrder: vi.fn(),
    projectGroupOwnerHostIdByGroupId: props.ownerHostIdById ?? ownerHostIdById,
    getScrollContainer: () => containerRef.current
  })
  return (
    <div ref={containerRef}>
      <div
        data-testid="virtual-row"
        data-worktree-virtual-row
        data-worktree-virtual-row-start={props.pinnedRowStart ?? 100}
      >
        <div
          data-testid="group-header"
          data-project-group-header-id={props.groupId ?? 'work'}
          data-project-group-header-bucket="root"
          data-project-group-header-index="0"
        />
      </div>
      <div
        role="button"
        onPointerDown={(event) => drag.onHandlePointerDown(event, props.anchor, props.registration)}
        onClick={props.onToggle}
      >
        <span data-repo-header-drag-handle>orca</span>
      </div>
      <output>{drag.state.draggingRepoId ?? 'idle'}</output>
    </div>
  )
}

// The group header spans 100–130, so its nest band is 109–121.
function renderHarness(props: HarnessProps): void {
  render(<DragHarness {...props} />)
  vi.spyOn(screen.getByTestId('group-header'), 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 100, 200, 30)
  )
  vi.spyOn(screen.getByTestId('virtual-row'), 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 100, 200, 30)
  )
}

function dragHandleTo(clientY: number): void {
  fireEvent.pointerDown(screen.getByText('orca'), { button: 0, pointerId: 1, clientY: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, buttons: 1, clientY })
  fireEvent.pointerUp(window, { pointerId: 1, buttons: 0, clientY })
}

describe('canDragProjectHeader', () => {
  const headerDrag = (groupOwners: [string, string | null][]) => ({
    canReorderRepoHeaders: true,
    projectGroupOwnerHostIdByGroupId: new Map(groupOwners),
    sidebarRepoHeaderIdsByBucket: new Map([['group:work', ['orca']]])
  })

  it('lets a project alone in its group move while groups exist', () => {
    expect(
      canDragProjectHeader({
        headerDrag: headerDrag([['work', 'local']]),
        project: localOrca,
        bucketKey: 'group:work',
        rootProjectHeaderCount: undefined
      })
    ).toBe(true)
  })

  it('keeps a lone project still when there are no groups to file it into', () => {
    expect(
      canDragProjectHeader({
        headerDrag: headerDrag([]),
        project: localOrca,
        bucketKey: 'group:work',
        rootProjectHeaderCount: 1
      })
    ).toBe(false)
  })

  it("keeps a lone remote project still when only this computer's groups exist", () => {
    expect(
      canDragProjectHeader({
        headerDrag: headerDrag([['work', 'local']]),
        project: m1Orca,
        bucketKey: 'group:work',
        rootProjectHeaderCount: 1
      })
    ).toBe(false)
  })
})

describe('useRepoHeaderDrag session wiring', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('starts a drag for a lone project once groups exist', () => {
    renderHarness({ anchor: localOrca, registration: localOrca, liveRepos: [localOrca] })
    fireEvent.pointerDown(screen.getByText('orca'), { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 1, buttons: 1, clientY: 40 })
    expect(screen.getByRole('status').textContent).toBe('orca')
  })

  it('does not arm a lone project without groups', () => {
    renderHarness({
      anchor: localOrca,
      registration: localOrca,
      liveRepos: [localOrca],
      usesProjectGroupOrdering: false,
      ownerHostIdById: new Map()
    })
    fireEvent.pointerDown(screen.getByText('orca'), { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 1, buttons: 1, clientY: 40 })
    expect(screen.getByRole('status').textContent).toBe('idle')
  })

  it("does not arm a lone remote project when only this computer's groups exist", () => {
    renderHarness({
      anchor: m1Orca,
      registration: m1Orca,
      liveRepos: [m1Orca],
      ownerHostIdById: new Map([['work', 'local']])
    })
    fireEvent.pointerDown(screen.getByText('orca'), { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 1, buttons: 1, clientY: 40 })
    expect(screen.getByRole('status').textContent).toBe('idle')
  })

  it('files the project into the group under the pointer instead of reordering', () => {
    const onCommitRepoOrder = vi.fn()
    const onCommitProjectGroupOrder = vi.fn()
    renderHarness({
      anchor: localOrca,
      registration: localOrca,
      liveRepos: [localOrca],
      onCommitRepoOrder,
      onCommitProjectGroupOrder
    })
    dragHandleTo(115)
    expect(onCommitProjectGroupOrder).toHaveBeenCalledWith(localOrca, 'work', expect.any(Number))
    expect(onCommitRepoOrder).not.toHaveBeenCalled()
  })

  it('files into a pinned group header where it is drawn, not where its row is laid out', () => {
    const onCommitProjectGroupOrder = vi.fn()
    renderHarness({
      anchor: localOrca,
      registration: localOrca,
      liveRepos: [localOrca],
      pinnedRowStart: 600,
      onCommitProjectGroupOrder
    })
    dragHandleTo(115)
    expect(onCommitProjectGroupOrder).toHaveBeenCalledWith(localOrca, 'work', expect.any(Number))
  })

  it("files the clicked machine's copy, not the header's anchor copy", () => {
    const onCommitProjectGroupOrder = vi.fn()
    renderHarness({
      anchor: localOrca,
      registration: m1Orca,
      liveRepos: [localOrca, m1Orca],
      groupId: 'm1-group',
      onCommitProjectGroupOrder
    })
    dragHandleTo(115)
    expect(onCommitProjectGroupOrder).toHaveBeenCalledWith(m1Orca, 'm1-group', expect.any(Number))
  })

  it('keeps the collapse click below the drag threshold and swallows it past it', () => {
    const onToggle = vi.fn()
    renderHarness({ anchor: localOrca, registration: localOrca, liveRepos: [localOrca], onToggle })
    dragHandleTo(2)
    fireEvent.click(screen.getByText('orca'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    dragHandleTo(40)
    fireEvent.click(screen.getByText('orca'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
