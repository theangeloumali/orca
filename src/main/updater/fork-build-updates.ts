import { IS_ORCA_DEV_APP } from '../startup/dev-app/orca-dev-app'

// Fork release builds are unsigned, so macOS cannot install updates over them, and an official
// release would replace the fork's features; the fork updater installs the fork's own releases.
// Orca Dev is replaced only by orca-dev-install, so neither updater may run in it.
export const OFFICIAL_UPDATES_DISABLED =
  (typeof ORCA_FORK_BUILD !== 'undefined' && ORCA_FORK_BUILD === true) || IS_ORCA_DEV_APP

/** This build's fork release tag; null for dev and local builds, which never self-update. */
export const FORK_RELEASE_TAG =
  IS_ORCA_DEV_APP || typeof ORCA_FORK_RELEASE_TAG === 'undefined' ? null : ORCA_FORK_RELEASE_TAG
