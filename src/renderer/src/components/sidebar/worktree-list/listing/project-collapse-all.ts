import { recordCollapsedGroupChanges } from '@/store/slices/ui/collapsed-group-toggle'
import { isProjectOrPinnedSectionGroupKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import type { HostSectionRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'

export { areAllProjectsCollapsed } from '../../../../../../shared/sidebar-list/sections/projects-collapsed'

// Machine sections fold with projects; per-host lanes like `pinned:host:x` stay out.
function isCollapseAllGroupKey(key: string): boolean {
  return key.startsWith('host:') || isProjectOrPinnedSectionGroupKey(key)
}

export function getRenderedProjectCollapseKeys(rows: readonly HostSectionRow[]): string[] {
  const keys = new Set<string>()
  for (const row of rows) {
    if (row.type === 'host-header') {
      keys.add(row.key)
      continue
    }
    if (row.type !== 'header') {
      continue
    }
    const key = row.collapseKey ?? row.key
    if (isProjectOrPinnedSectionGroupKey(key)) {
      keys.add(key)
    }
  }
  return [...keys]
}

// Expanding clears pinned, machine and every project key, including hidden nested projects.
export function setAllProjectsCollapsed(
  collapsedGroups: ReadonlySet<string>,
  projectKeys: readonly string[],
  collapsed: boolean
): Set<string> {
  const keys = collapsed ? projectKeys : [...collapsedGroups].filter(isCollapseAllGroupKey)
  const next = new Set(collapsedGroups)
  for (const key of keys) {
    if (collapsed) {
      next.add(key)
    } else {
      next.delete(key)
    }
  }
  return recordCollapsedGroupChanges(collapsedGroups, next, keys)
}
