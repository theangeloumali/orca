import {
  getHostDisplayLabelOverrides,
  type HostSettingOverrides
} from '../../../../shared/execution-host/host-setting-overrides'
import { pickHostAppearance } from '../../../../shared/execution-host/host-appearance'
import type { RuntimeHostOverride } from './runtime-client-settings-shape'

/** Labels, colors and tints only; defaultWorktreeLocation stays host-private. */
export function projectRuntimeHostOverrides(
  overrides: Readonly<Record<string, HostSettingOverrides | undefined>> | undefined
): Record<string, RuntimeHostOverride> {
  const labels: ReadonlyMap<string, string> = getHostDisplayLabelOverrides({
    hostSettingOverrides: overrides
  })
  const projected = Object.entries(overrides ?? {}).flatMap(([hostId, stored]) => {
    const label = labels.get(hostId)
    const entry: RuntimeHostOverride = {
      ...(label ? { displayLabel: label } : {}),
      ...pickHostAppearance(stored ?? {})
    }
    return Object.keys(entry).length > 0 ? [[hostId, entry] as const] : []
  })
  return Object.fromEntries(projected)
}
