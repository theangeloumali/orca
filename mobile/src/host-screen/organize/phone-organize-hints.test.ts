import { describe, expect, it } from 'vitest'
import { getRepoRowIdentitiesKey } from '../../../../src/shared/project/catalog/idle-hint-dismissal'
import type { SectionRepo, Worktree } from '../../worktree/workspace-list/workspace-list-types'
import { buildClientHint, buildIdleHint } from './phone-organize-hints'
import { worktreeRow } from '../../test-support/worktree-row-fixture'

const DAY = 24 * 60 * 60 * 1000
const NOW = 100 * DAY
const repo = (id: string, extra: Partial<SectionRepo> = {}): SectionRepo => ({
  id,
  displayName: id,
  path: `/Users/me/code/${id}`,
  addedAt: 0,
  ...extra
})
const row = (repoId: string, lastActivityAt: number): Worktree =>
  worktreeRow({ repoId, worktreeId: `${repoId}::w`, lastActivityAt })

describe('buildIdleHint', () => {
  it('offers projects untouched for 30 days or more', () => {
    const hint = buildIdleHint([repo('old'), repo('busy')], [row('busy', NOW - DAY)], NOW, null)
    expect(hint?.repos.map((r) => r.id)).toEqual(['old'])
  })

  it('never offers an archived project or a just-added one', () => {
    const hint = buildIdleHint(
      [repo('archived', { hiddenAt: 1 }), repo('new', { addedAt: NOW - DAY })],
      [],
      NOW,
      null
    )
    expect(hint).toBeNull()
  })

  it('stays quiet once the same idle set was dismissed', () => {
    const idle = [repo('old')]
    expect(buildIdleHint(idle, [], NOW, getRepoRowIdentitiesKey(idle))).toBeNull()
  })
})

describe('buildClientHint', () => {
  const work = (id: string) => repo(id, { path: `/Users/me/Work/Acme/${id}` })

  it("suggests a client's group once three of its projects are ungrouped", () => {
    const hint = buildClientHint([work('a'), work('b'), work('c')], [], null, () => true)
    expect(hint?.suggestions.map((s) => [s.clientName, s.projects.length])).toEqual([['Acme', 3]])
  })

  it('skips machines the phone cannot file projects on', () => {
    expect(buildClientHint([work('a'), work('b'), work('c')], [], null, () => false)).toBeNull()
  })
})
