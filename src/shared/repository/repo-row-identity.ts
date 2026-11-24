import type { Repo } from './repo-types'
import { normalizeHostPart } from '../execution-host/execution-host'
import { getRepoHostIdentity } from './repo-host-identity'

type RepoIdentityParts = Pick<Repo, 'id' | 'connectionId' | 'executionHostId'>

/** One project row: its host identity and nested SSH target, so a server's twins stay apart. */
export function getRepoRowIdentity(repo: RepoIdentityParts): string {
  return JSON.stringify([getRepoHostIdentity(repo), normalizeHostPart(repo.connectionId)])
}
