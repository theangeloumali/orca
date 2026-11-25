import type { HostSettingOverrides } from '../execution-host/host-setting-overrides'

/** Settings only the fork adds, kept apart so upstream syncs of GlobalSettings stay clean. */
export type GlobalSettingsForkFields = {
  /** Per-computer sidebar background strength by group id; group colors sync on the group. */
  projectGroupTints?: Partial<Record<string, NonNullable<HostSettingOverrides['sectionTint']>>>
}
