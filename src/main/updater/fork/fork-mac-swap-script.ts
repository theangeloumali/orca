/** One POSIX-shell word: single-quoted, with embedded quotes closed and reopened. */
function shellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * The swap that runs after Orca quits. The old app is kept until the new one is still running a
 * few seconds after launch, and put back otherwise, so a bad update never leaves the machine
 * without a working Orca.
 */
export function buildMacSwapScript(args: {
  pid: number
  appPath: string
  stagedAppPath: string
  settleSeconds?: number
}): string {
  const app = shellWord(args.appPath)
  const previous = shellWord(`${args.appPath}.previous`)
  const staged = shellWord(args.stagedAppPath)
  const binaries = shellWord(`${args.appPath}/Contents/MacOS/`)
  return [
    // Orca still running after 5 minutes means the quit was cancelled: leave it alone.
    `i=0; while kill -0 ${args.pid} 2>/dev/null; do i=$((i+1)); [ "$i" -gt 600 ] && exit 1; sleep 0.5; done`,
    `rm -rf ${previous}`,
    `mv ${app} ${previous} || { open ${app}; exit 1; }`,
    `if ! mv ${staged} ${app}; then mv ${previous} ${app}; open ${app}; exit 1; fi`,
    `xattr -dr com.apple.quarantine ${app} 2>/dev/null`,
    `if open ${app}; then`,
    `  sleep ${args.settleSeconds ?? 20}`,
    `  if pgrep -f -- ${binaries} >/dev/null 2>&1; then rm -rf ${previous}; exit 0; fi`,
    'fi',
    `rm -rf ${app}`,
    `mv ${previous} ${app}`,
    `open ${app}`,
    'exit 1'
  ].join('\n')
}
