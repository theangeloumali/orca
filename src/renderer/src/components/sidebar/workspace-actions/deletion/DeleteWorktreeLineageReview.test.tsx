// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { repo, worktree } from '../../worktree-list/grouping/worktree-list-groups-test-fixtures'
import { DeleteWorktreeLineageReview } from './DeleteWorktreeLineageReview'

// One project cloned on this computer and on a paired M1.
const gitRemoteIdentity = {
  canonicalKey: 'github.com/acme/picklebook',
  remoteName: 'origin',
  remoteUrl: 'git@github.com:acme/picklebook.git'
}
const onM5: Repo = {
  ...repo,
  id: 'pb-m5',
  path: '/pb',
  displayName: 'PickleBook',
  gitRemoteIdentity
}
const onM1: Repo = {
  ...onM5,
  id: 'pb-m1',
  displayName: 'PickleBook M1',
  executionHostId: 'runtime:m1'
}
const repoMap = new Map([
  [onM5.id, onM5],
  [onM1.id, onM1]
])

function workspace(id: string, repoOf: Repo, hostId?: Worktree['hostId']): Worktree {
  return {
    ...worktree,
    id: `${repoOf.id}::/pb/${id}`,
    repoId: repoOf.id,
    path: `/pb/${id}`,
    displayName: id,
    hostId
  }
}
const parent = workspace('parent-work', onM5)
const childOnM5 = workspace('child-on-m5', onM5)
const childOnM1 = workspace('child-on-m1', onM1, 'runtime:m1')

function renderReview(showWorkspaceHostSections: boolean): void {
  const projection = getProjectHostSetupProjectionFromState({ repos: [onM5, onM1] })
  useAppStore.setState({
    projects: projection.projects,
    projectHostSetups: projection.setups,
    showWorkspaceHostSections
  })
  render(
    <DeleteWorktreeLineageReview
      parent={parent}
      descendants={[childOnM5, childOnM1]}
      repoMap={repoMap}
      dirtyChanges={{ counts: new Map(), checkStates: new Map(), previews: new Map() }}
      atRiskLocalFilesByIdentity={new Map()}
      unsavedFiles={[]}
      keepChildren={false}
    />
  )
}

// The project label sits right after the workspace name; none means "same row as the parent".
function projectLabelOf(displayName: string): string | null {
  return (
    screen.getByText(displayName, { selector: 'li span' }).nextElementSibling?.textContent ?? null
  )
}

describe('DeleteWorktreeLineageReview', () => {
  afterEach(cleanup)

  it("labels each child with its own machine's project row when machine sections are on", () => {
    renderReview(true)
    expect(projectLabelOf('child-on-m5')).toBeNull()
    expect(projectLabelOf('child-on-m1')).toBe(onM1.displayName)
  })

  it('keeps both machines under the merged project row when machine sections are off', () => {
    renderReview(false)
    expect(projectLabelOf('child-on-m5')).toBeNull()
    expect(projectLabelOf('child-on-m1')).toBeNull()
  })
})
