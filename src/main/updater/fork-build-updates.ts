// Fork release builds are unsigned, so macOS cannot install updates over them, and an official
// release would replace the fork's features; the fork updater installs the fork's own releases.
export const OFFICIAL_UPDATES_DISABLED =
  typeof ORCA_FORK_BUILD !== 'undefined' && ORCA_FORK_BUILD === true

/** This build's fork release tag; null for dev and local builds, which never self-update. */
export const FORK_RELEASE_TAG =
  typeof ORCA_FORK_RELEASE_TAG !== 'undefined' ? ORCA_FORK_RELEASE_TAG : null
