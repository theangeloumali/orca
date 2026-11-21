import { describe, expect, it } from 'vitest'
import { buildSidebarFeedRows, type SidebarFeedView } from './sidebar-feed-rows'
import type { SidebarFeedDomains } from './sidebar-feed-domains'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import { NO_WORKSPACE_ROW_FILTERS } from '../../workspace-view/workspace-row-filters'

const EMPTY_DOMAINS: SidebarFeedDomains = {
  workspaces: new Map(),
  activity: new Map(),
  review: new Map(),
  creations: new Map(),
  pairedServerHosts: new Map(),
  pairedServerRows: new Map(),
  repoIcons: new Map(),
  desktop: null,
  projectCatalog: null,
  retention: null
}

const emptyGroup: ProjectGroup = {
  id: 'empty',
  name: 'Empty',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0
}

function headerKeys(showOnlyRunningTerminals: boolean): string[] {
  const view: SidebarFeedView = {
    groupBy: 'repo',
    sortBy: 'name',
    projectOrderBy: 'manual',
    collapsedGroups: new Set(),
    filters: { ...NO_WORKSPACE_ROW_FILTERS, showOnlyRunningTerminals },
    workspaceHostScope: 'all',
    visibleWorkspaceHostIds: null,
    workspaceStatuses: [],
    pinnedDisplayPolicy: 'single-location',
    defaultHostId: 'local',
    hostLabelOverrides: new Map(),
    localHostLabel: 'This Mac'
  }
  const catalog = {
    repos: [],
    projectGroups: [emptyGroup],
    projectGrouping: { projects: [], projectHostSetups: [] }
  }
  return buildSidebarFeedRows(EMPTY_DOMAINS, catalog, view).rows.flatMap((row) =>
    row.type === 'header' ? [row.key] : []
  )
}

describe('buildSidebarFeedRows under Active only', () => {
  it('prunes an empty project group, as the window list does', () => {
    expect(headerKeys(false)).toContain('project-group:empty')
    expect(headerKeys(true)).toEqual([])
  })
})
