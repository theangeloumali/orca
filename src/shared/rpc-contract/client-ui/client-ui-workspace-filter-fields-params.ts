import { z } from 'zod'

export const ClientUiWorkspaceFilterFields = {
  hideDefaultBranchWorkspace: z.boolean().optional(),
  hideAutomationGeneratedWorkspaces: z.boolean().optional(),
  hideCliCreatedWorkspaces: z.boolean().optional(),
  hideDetachedHeadWorkspaces: z.boolean().optional(),
  hideWorkspacesFromOtherDevices: z.boolean().optional(),
  alwaysShowDefaultBranchWorkspace: z.boolean().optional(),
  showOnlyRunningTerminals: z.boolean().optional(),
  showOnlyNeedsYou: z.boolean().optional(),
  filterRepoIds: z.array(z.string()).optional(),
  // Sidebar list display state; kept here so client-ui-params stays under max-lines.
  showWorkspaceHostSections: z.boolean().optional(),
  dismissedIdleProjectsKey: z.string().nullable().optional(),
  dismissedClientSuggestionsKey: z.string().nullable().optional()
}
