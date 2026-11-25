/** Substituted by electron.vite.config.ts in main and renderer; absent (off) in tests, the tsc CLI and the web client. */
declare const ORCA_FORK_DEV_APP: boolean | undefined

/** True only in the installed Orca Dev build (ORCA_FORK_DEV_APP=1 at build time). */
export const IS_ORCA_DEV_APP = typeof ORCA_FORK_DEV_APP === 'boolean' && ORCA_FORK_DEV_APP
