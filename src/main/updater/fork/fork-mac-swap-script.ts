/** One POSIX-shell word: single-quoted, with embedded quotes closed and reopened. */
function shellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * The swap that runs after Orca quits. The old app is kept until the new one reports a clean
 * start (it writes `launchedMarkerPath` once its window is up) and is put back otherwise, so a
 * bad update never leaves the machine without a working Orca. One swap runs at a time.
 */
export function buildMacSwapScript(args: {
  pid: number
  appPath: string
  stagedAppPath: string
  launchedMarkerPath: string
  lockPath: string
  settleSeconds?: number
}): string {
  const app = shellWord(args.appPath)
  const previous = shellWord(`${args.appPath}.previous`)
  const staged = shellWord(args.stagedAppPath)
  const marker = shellWord(args.launchedMarkerPath)
  const lock = shellWord(args.lockPath)
  const settleTicks = (args.settleSeconds ?? 120) * 2
  const binaries = shellWord(`${args.appPath}/Contents/MacOS/`)
  return [
    `mkdir ${lock} 2>/dev/null || exit 0`,
    `trap ${shellWord(`rm -rf ${lock}`)} EXIT`,
    // Under the updater's 60s give-up: a quit still pending after 55s was cancelled, so leave Orca alone.
    `i=0; while kill -0 ${args.pid} 2>/dev/null; do i=$((i+1)); [ "$i" -gt 110 ] && exit 1; sleep 0.5; done`,
    `rm -f ${marker}`,
    `rm -rf ${previous}`,
    `mv ${app} ${previous} || { open ${app}; exit 1; }`,
    `if ! mv ${staged} ${app}; then mv ${previous} ${app}; open ${app}; exit 1; fi`,
    `xattr -dr com.apple.quarantine ${app} 2>/dev/null`,
    `if open ${app}; then`,
    `  i=0; while [ "$i" -lt ${settleTicks} ]; do [ -f ${marker} ] && { rm -rf ${previous}; exit 0; }; i=$((i+1)); sleep 0.5; done`,
    'fi',
    // Stop a new build that never reported starting before putting the old one back.
    `pkill -f -- ${binaries} 2>/dev/null; sleep 1`,
    `rm -rf ${app}`,
    `mv ${previous} ${app}`,
    `open ${app}`,
    'exit 1'
  ].join('\n')
}
