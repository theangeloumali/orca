import { describe, expect, it } from 'vitest'
import type { Repo } from '../../repository/repo-types'
import type { ProjectGroup } from './project-group-types'
import { getClientName, suggestClientGroups } from './client-suggestions'

function project(id: string, path: string, extra: Partial<Repo> = {}): Repo {
  return { id, path, displayName: id, badgeColor: '#000000', addedAt: 0, ...extra }
}

function owned(id: string, owner: string, extra: Partial<Repo> = {}): Repo {
  const canonicalKey = `github.com/${owner}/${id}`
  return project(id, `/Users/me/code/${id}`, {
    gitRemoteIdentity: { canonicalKey, remoteName: 'origin', remoteUrl: `https://${canonicalKey}` },
    ...extra
  })
}

function group(id: string, name: string, extra: Partial<ProjectGroup> = {}): ProjectGroup {
  return {
    id,
    name,
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
    ...extra
  }
}

const ids = (repos: readonly Repo[]): string[] => repos.map((entry) => entry.id)

describe('getClientName', () => {
  it('reads the folder right after Work', () => {
    expect(getClientName(project('a', '/Users/me/Desktop/Work/ZKidz/orca'))).toBe('ZKidz')
    expect(getClientName(project('a', 'C:\\Users\\me\\Work\\Acme\\site'))).toBe('Acme')
  })

  it('does not treat a project directly inside Work as its own client', () => {
    expect(getClientName(project('orca', '/Users/me/Work/orca'))).toBeNull()
  })

  it('falls back to the GitHub owner, and skips projects with neither', () => {
    expect(getClientName(owned('site', 'acme'))).toBe('acme')
    expect(getClientName(project('loose', '/tmp/loose'))).toBeNull()
  })
})

describe('suggestClientGroups', () => {
  it('suggests a new group for two or more projects of one client', () => {
    const repos = [
      project('orca', '/Users/me/Work/ZKidz/orca'),
      project('aicc', '/Users/me/Work/ZKidz/aicc'),
      project('solo', '/Users/me/Work/Lonely/solo')
    ]
    const [section] = suggestClientGroups({ repos, projectGroups: [] })
    expect(section.hostId).toBe('local')
    expect(section.suggestions).toHaveLength(1)
    expect(section.suggestions[0]).toMatchObject({ clientName: 'ZKidz', existingGroupId: null })
    expect(ids(section.suggestions[0].projects)).toEqual(['orca', 'aicc'])
  })

  it('merges path and owner clients and files one project into a same-named group', () => {
    const repos = [owned('site', 'zkidz'), project('solo', '/Users/me/Work/Acme/solo')]
    const sections = suggestClientGroups({
      repos,
      projectGroups: [group('g-zkidz', 'ZKidz'), group('g-acme', 'acme')]
    })
    expect(sections[0].suggestions).toEqual([
      expect.objectContaining({ clientName: 'acme', existingGroupId: 'g-acme' }),
      expect.objectContaining({ clientName: 'ZKidz', existingGroupId: 'g-zkidz' })
    ])
  })

  it('skips archived and already-grouped projects', () => {
    const repos = [
      project('a', '/Users/me/Work/ZKidz/a'),
      project('b', '/Users/me/Work/ZKidz/b', { hiddenAt: 1 }),
      project('c', '/Users/me/Work/ZKidz/c', { projectGroupId: 'g-other' })
    ]
    expect(suggestClientGroups({ repos, projectGroups: [] })).toEqual([])
  })

  it("splits by machine and ignores another machine's same-named group", () => {
    const repos = [
      project('a', '/Users/me/Work/ZKidz/a'),
      project('b', '/Users/me/Work/ZKidz/b'),
      project('c', '/home/me/Work/ZKidz/c', { connectionId: 'box' }),
      project('d', '/home/me/Work/ZKidz/d', { connectionId: 'box' })
    ]
    const sections = suggestClientGroups({
      repos,
      projectGroups: [group('g-remote', 'ZKidz', { connectionId: 'box' })]
    })
    expect(sections.map((section) => section.hostId)).toEqual(['local', 'ssh:box'])
    expect(sections[0].suggestions[0].existingGroupId).toBeNull()
    expect(sections[1].suggestions[0].existingGroupId).toBe('g-remote')
    expect(ids(sections[1].suggestions[0].projects)).toEqual(['c', 'd'])
  })

  it('counts a project registered twice on one machine once', () => {
    const copy = project('a', '/Users/me/Work/ZKidz/a')
    const repos = [copy, { ...copy }, project('b', '/Users/me/Work/ZKidz/b')]
    const [section] = suggestClientGroups({ repos, projectGroups: [] })
    expect(ids(section.suggestions[0].projects)).toEqual(['a', 'b'])
  })
})
