/** One POSIX-shell word: single-quoted, with embedded quotes closed and reopened. */
function shellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * The swap that runs after Orca quits. The old app is kept beside the new one until the new one
 * launches, and put back if it does not, so a failed update never leaves the machine without Orca.
 */
export function buildMacSwapScript(args: {
  pid: number
  appPath: string
  stagedAppPath: string
}): string {
  const app = shellWord(args.appPath)
  const previous = shellWord(`${args.appPath}.previous`)
  const staged = shellWord(args.stagedAppPath)
  return [
    // Wait up to 5 minutes for Orca to finish quitting.
    `i=0; while kill -0 ${args.pid} 2>/dev/null; do i=$((i+1)); [ "$i" -gt 600 ] && exit 1; sleep 0.5; done`,
    `rm -rf ${previous}`,
    `mv ${app} ${previous} || exit 1`,
    `if mv ${staged} ${app}; then`,
    `  xattr -dr com.apple.quarantine ${app} 2>/dev/null`,
    `  if open ${app}; then rm -rf ${previous}; exit 0; fi`,
    `  rm -rf ${app}`,
    'fi',
    `mv ${previous} ${app}`,
    `open ${app}`,
    'exit 1'
  ].join('\n')
}
