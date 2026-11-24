import type { Repo } from '../../repository/repo-types'
import { getRepoRowIdentity } from '../../repository/repo-row-identity'

/** Identifies a set of project rows; see {@link isIdleHintDismissed} for when a dismissal holds. */
export function getRepoRowIdentitiesKey(
  idleRepos: readonly Pick<Repo, 'id' | 'connectionId' | 'executionHostId'>[]
): string {
  return idleRepos.map(getRepoRowIdentity).sort().join('\n')
}

/** A dismissal holds while the idle set only shrinks; a newly idle project brings the hint back. */
export function isIdleHintDismissed(idleKey: string, dismissedKey: string | null): boolean {
  if (dismissedKey === null) {
    return false
  }
  const dismissed = new Set(dismissedKey.split('\n'))
  return idleKey.split('\n').every((identity) => dismissed.has(identity))
}
