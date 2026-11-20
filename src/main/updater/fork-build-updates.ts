// Fork release builds are unsigned, so macOS cannot install updates over them, and an official
// release would replace the fork's features; their updates ship as GitHub Releases on the fork.
export const OFFICIAL_UPDATES_DISABLED =
  typeof ORCA_FORK_BUILD !== 'undefined' && ORCA_FORK_BUILD === true
