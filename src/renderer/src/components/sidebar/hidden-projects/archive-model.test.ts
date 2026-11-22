import { describe, expect, it } from 'vitest'
import { repo } from '../worktree-list/grouping/worktree-list-groups-test-fixtures'
import type { Repo } from '../../../../../shared/repository/repo-types'
import {
  createLastActiveAtSelector,
  getLastActiveAtByRow,
  groupArchivedRepos,
  selectIdleListedRepos,
  type ProjectActivityInputs
} from './archive-model'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = 1_000 * DAY_MS

function project(id: string, extra: Partial<Repo> = {}): Repo {
  return { ...repo, id, displayName: id, addedAt: NOW - 400 * DAY_MS, ...extra }
}

function activity(
  byRepo: Record<string, { id: string; lastActivityAt: number; hostId?: `ssh:${string}` }[]>
): ProjectActivityInputs {
  return { workspacesByRepoId: byRepo, visits: {} }
}

describe('groupArchivedRepos', () => {
  it('groups archived projects by machine, this computer first, newest archive first', () => {
    const groups = groupArchivedRepos([
      project('remote-a', { connectionId: 'box', hiddenAt: 5 }),
      project('local-old', { hiddenAt: 1 }),
      project('listed'),
      project('local-new', { hiddenAt: 9 })
    ])
    expect(groups.map((group) => [group.hostId, group.repos.map((entry) => entry.id)])).toEqual([
      ['local', ['local-new', 'local-old']],
      ['ssh:box', ['remote-a']]
    ])
  })

  it('returns no groups when nothing is archived', () => {
    expect(groupArchivedRepos([project('listed')])).toEqual([])
  })
})

describe('selectIdleListedRepos', () => {
  it('picks listed projects idle 30+ days from their newest workspace, never archived ones', () => {
    const repos = [
      project('busy'),
      project('stale'),
      project('fresh-added', { addedAt: NOW - 3 * DAY_MS }),
      project('old-added'),
      project('archived', { hiddenAt: 1 })
    ]
    const inputs = activity({
      busy: [
        { id: 'busy::a', lastActivityAt: NOW - 90 * DAY_MS },
        { id: 'busy::b', lastActivityAt: NOW - 2 * DAY_MS }
      ],
      stale: [{ id: 'stale::a', lastActivityAt: NOW - 30 * DAY_MS }],
      archived: []
    })
    expect(
      selectIdleListedRepos(repos, getLastActiveAtByRow(repos, inputs), NOW).map(
        (entry) => entry.id
      )
    ).toEqual(['stale', 'old-added'])
  })

  it("reads only the workspaces on the project's own machine", () => {
    const repos = [project('twin'), project('twin', { connectionId: 'box' })]
    const inputs = activity({
      twin: [{ id: 'twin::remote', hostId: 'ssh:box', lastActivityAt: NOW - DAY_MS }]
    })
    expect(
      selectIdleListedRepos(repos, getLastActiveAtByRow(repos, inputs), NOW).map(
        (entry) => entry.connectionId
      )
    ).toEqual([repo.connectionId])
  })

  it("does not credit an unstamped workspace to either machine's copy of a shared project", () => {
    const repos = [project('twin'), project('twin', { connectionId: 'box' })]
    const inputs = activity({ twin: [{ id: 'twin::unknown', lastActivityAt: NOW - DAY_MS }] })
    expect(selectIdleListedRepos(repos, getLastActiveAtByRow(repos, inputs), NOW)).toHaveLength(2)
  })

  it("reads a remote workspace's visit under its resolved machine's key", () => {
    const repos = [project('remote', { connectionId: 'box' })]
    const inputs: ProjectActivityInputs = {
      workspacesByRepoId: { remote: [{ id: 'remote::a', lastActivityAt: NOW - 90 * DAY_MS }] },
      visits: { 'ssh:box|remote::a': NOW - DAY_MS }
    }
    expect(selectIdleListedRepos(repos, getLastActiveAtByRow(repos, inputs), NOW)).toEqual([])
  })
})

describe('createLastActiveAtSelector', () => {
  function countingInputs(onRead: () => void): ProjectActivityInputs {
    const workspacesByRepoId = new Proxy<ProjectActivityInputs['workspacesByRepoId']>(
      {},
      {
        get: (_target, _key) => {
          onRead()
          return undefined
        }
      }
    )
    return { workspacesByRepoId, visits: {} }
  }

  it('reads no workspaces when nothing is archived and no project could be idle yet', () => {
    let reads = 0
    const select = createLastActiveAtSelector()
    const fresh = [project('new-a', { addedAt: NOW - DAY_MS }), project('new-b', { addedAt: NOW })]
    expect(
      select(
        fresh,
        countingInputs(() => reads++),
        NOW
      )
    ).toEqual({})
    expect(reads).toBe(0)
  })

  it('returns the same answer without recomputing while its inputs are unchanged', () => {
    let reads = 0
    const select = createLastActiveAtSelector()
    const repos = [project('old')]
    const inputs = countingInputs(() => reads++)
    const first = select(repos, inputs, NOW)
    expect(select(repos, inputs, NOW)).toBe(first)
    expect(reads).toBe(1)
  })
})
