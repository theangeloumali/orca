// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { makeWorktree } from '../../../../store/slices/worktrees/worktree.test-fixture'
import { makeOpenFile } from '../../../../store/slices/editor/types/open-file.test-fixture'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import RemoveFolderDialog from './RemoveFolderDialog'

const SSH_HOST = 'ssh:target-1'
const sshRepo: Repo = {
  id: 'remote-repo',
  path: '/remote/repo',
  displayName: 'Remote',
  badgeColor: '#000',
  addedAt: 1,
  connectionId: 'target-1',
  executionHostId: SSH_HOST
}
// Unstamped: only its SSH repo row says which host owns it.
const unstampedWorktree = makeWorktree({
  id: 'remote-repo::/remote/repo/feature',
  repoId: sshRepo.id,
  path: '/remote/repo/feature'
})

const initialState = useAppStore.getState()
afterEach(() => {
  cleanup()
  useAppStore.setState(initialState, true)
})

it('reports an unsaved file in an SSH project’s unstamped worktree', async () => {
  useAppStore.setState({
    activeModal: 'confirm-remove-folder',
    modalData: { repoId: sshRepo.id, displayName: sshRepo.displayName, hostId: SSH_HOST },
    repos: [sshRepo],
    worktreesByRepo: { [sshRepo.id]: [unstampedWorktree] },
    openFiles: [
      makeOpenFile({
        id: '/remote/repo/feature/notes.md',
        worktreeId: unstampedWorktree.id,
        relativePath: 'notes.md',
        isDirty: true
      })
    ]
  })

  render(<RemoveFolderDialog />)

  expect(await screen.findByText('notes.md')).toBeTruthy()
})
