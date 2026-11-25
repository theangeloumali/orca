/** Substituted by electron.vite.config.ts in main and renderer; absent (off) in tests, the tsc CLI and the web client. */
declare const ORCA_FORK_DEV_APP: boolean | undefined

/** Carries the Orca Dev identity into children built without the define, such as orcad. */
export const ORCA_FORK_DEV_APP_ENV = 'ORCA_FORK_DEV_APP'

/** True only in the installed Orca Dev build, or a child it started with ORCA_FORK_DEV_APP=1. */
export const IS_ORCA_DEV_APP =
  typeof ORCA_FORK_DEV_APP === 'boolean'
    ? ORCA_FORK_DEV_APP
    : typeof process !== 'undefined' && process.env[ORCA_FORK_DEV_APP_ENV] === '1'
