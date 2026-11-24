/** A fork build without its own push keys: Stably's push service delivers only to the official app ids. */
export function forkBuildLacksPush(extra: unknown): boolean {
  if (typeof extra !== 'object' || extra === null) {
    return false
  }
  return Reflect.get(extra, 'orcaForkBuild') === true && Reflect.get(extra, 'orcaForkPush') !== true
}
