import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../src/shared/execution-host/execution-host'
import type { ExecutionHostHealth } from '../../../../src/shared/execution-host/execution-host-health'
import {
  resolveHostColor,
  resolveHostSectionTint
} from '../../../../src/shared/execution-host/host-appearance'
import {
  hostTintPercents,
  type SidebarContrastPalette
} from '../../../../src/shared/execution-host/host-tint-contrast'
import { groupByExecutionHost } from '../../../../src/shared/sidebar-list/hosts/device-sections'
import type {
  HostAppearanceOverride,
  MachineSectionHeader,
  Section,
  WorkspaceListItem
} from './workspace-list-types'

type MachineStatus = MachineSectionHeader['status']

const OFFLINE_HEALTH = new Set<ExecutionHostHealth>([
  'blocked',
  'disconnected',
  'error',
  'suspended'
])

export function machineStatusFromHealth(health: ExecutionHostHealth | undefined): MachineStatus {
  if (health === 'local' || health === 'available') {
    return 'online'
  }
  return health && OFFLINE_HEALTH.has(health) ? 'offline' : null
}

export type MachineGroupingInputs = {
  sections: readonly Section[]
  collapsedGroups: ReadonlySet<string>
  hostIdOfItem: (item: WorkspaceListItem) => ExecutionHostId
  /** Where a section with no rows (an empty project) belongs. */
  hostIdOfSection: (section: Section) => ExecutionHostId
  labelOf: (hostId: ExecutionHostId) => string
  statusOf: (hostId: ExecutionHostId) => MachineStatus
  overrides: ReadonlyMap<ExecutionHostId, HostAppearanceOverride>
  palettes: readonly SidebarContrastPalette[] | null
}

export type ShownSections = { rawSections: Section[]; sections: Section[] }

type Slice = { hostId: ExecutionHostId; section: Section; items: WorkspaceListItem[] }

function emptyCollapsed(section: Section, sourceKey: string, collapsed: ReadonlySet<string>) {
  return collapsed.has(sourceKey) ? { ...section, data: [] } : section
}

function sliceByHost(section: Section, inputs: MachineGroupingInputs): Slice[] {
  if (section.data.length === 0) {
    return [{ hostId: inputs.hostIdOfSection(section), section, items: [] }]
  }
  const byHost = groupByExecutionHost({
    items: section.data,
    getHostId: inputs.hostIdOfItem,
    hostOrder: []
  })
  return byHost.map(({ hostId, items }) => ({ hostId, section, items }))
}

function machineHeader(
  hostId: ExecutionHostId,
  slices: readonly Slice[],
  orderedHostIds: readonly ExecutionHostId[],
  inputs: MachineGroupingInputs
): Section {
  const key = `host:${hostId}`
  const settings = { hostSettingOverrides: Object.fromEntries(inputs.overrides) }
  const color = resolveHostColor(settings, hostId, orderedHostIds)
  const tinted = color !== null && resolveHostSectionTint(settings, hostId) !== 'off'
  // The rows' own host label first, so the header reads as each row's pill does (runtime servers by name).
  const rowLabel = slices.flatMap(({ items }) => items).find((item) => item.view.hostContextLabel)
  const label = rowLabel?.view.hostContextLabel ?? inputs.labelOf(hostId)
  // Pinned rows repeat in their project, so a machine counts each row once.
  const count = new Set(slices.flatMap(({ items }) => items.map((item) => item.row))).size
  const machine: MachineSectionHeader = {
    hostId,
    label,
    color,
    tintPercent: tinted ? hostTintPercents(color, inputs.palettes).header : 0,
    count,
    status: inputs.statusOf(hostId),
    collapsed: inputs.collapsedGroups.has(key)
  }
  return { key, collapseKey: key, title: label, count, data: [], machine }
}

/** Sections split under one header per computer, this one first; null when the rows sit on one computer. */
export function groupSectionsByMachine(inputs: MachineGroupingInputs): ShownSections | null {
  const { collapsedGroups } = inputs
  const slices = inputs.sections.flatMap((section) => sliceByHost(section, inputs))
  const hostsWithRows = new Set(
    slices.flatMap((slice) => (slice.items.length ? [slice.hostId] : []))
  )
  if (hostsWithRows.size < 2) {
    return null
  }
  const byLabel = [...new Set(slices.map((slice) => slice.hostId))].sort((a, b) =>
    inputs.labelOf(a).localeCompare(inputs.labelOf(b))
  )
  const machines = groupByExecutionHost({
    items: slices,
    getHostId: (slice) => slice.hostId,
    hostOrder: byLabel,
    anchorHostId: LOCAL_EXECUTION_HOST_ID
  })
  const orderedHostIds = machines.map(({ hostId }) => hostId)
  const shown = machines.flatMap(({ hostId, items: hostSlices }) => {
    const header = machineHeader(hostId, hostSlices, orderedHostIds, inputs)
    if (header.machine?.collapsed) {
      return [{ raw: header, visible: header }]
    }
    const children = hostSlices.map(({ section, items }) => {
      const raw: Section = {
        ...section,
        key: `${section.key}@${hostId}`,
        collapseKey: section.collapseKey ?? section.key,
        machineColor: header.machine?.color ?? null,
        data: items
      }
      return { raw, visible: emptyCollapsed(raw, section.key, collapsedGroups) }
    })
    return [{ raw: header, visible: header }, ...children]
  })
  return { rawSections: shown.map(({ raw }) => raw), sections: shown.map(({ visible }) => visible) }
}
