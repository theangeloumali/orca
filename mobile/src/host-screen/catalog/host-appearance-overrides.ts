import * as z from 'zod'
import { normalizeExecutionHostId } from '../../../../src/shared/execution-host/execution-host'
import { HOST_SECTION_TINTS } from '../../../../src/shared/execution-host/host-appearance'
import type { HostAppearanceOverride } from '../../worktree/workspace-list/workspace-list-types'
import type { ExecutionHostId } from '../../../../src/shared/execution-host/execution-host'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Each host's color and tint from settings.get; an older desktop shares labels only, so none. */
export function readHostAppearanceOverrides(
  hostSettingOverrides: unknown
): [ExecutionHostId, HostAppearanceOverride][] {
  if (!isRecord(hostSettingOverrides)) {
    return []
  }
  return Object.entries(hostSettingOverrides).flatMap(([id, stored]) => {
    const hostId = normalizeExecutionHostId(id)
    if (!hostId || !isRecord(stored)) {
      return []
    }
    const color = typeof stored.color === 'string' ? stored.color : undefined
    const sectionTint = HOST_SECTION_TINTS.find((tint) => tint === stored.sectionTint)
    const override: HostAppearanceOverride = {
      ...(color ? { color } : {}),
      ...(sectionTint ? { sectionTint } : {})
    }
    return Object.keys(override).length > 0 ? [[hostId, override] as const] : []
  })
}

type HostAppearanceEntry = [ExecutionHostId, HostAppearanceOverride]

/** A stored entry is kept only when it reads back as itself. */
export const storedHostAppearanceSchema = z.custom<HostAppearanceEntry>(
  (entry) =>
    Array.isArray(entry) &&
    typeof entry[0] === 'string' &&
    readHostAppearanceOverrides({ [entry[0]]: entry[1] }).length === 1
)
