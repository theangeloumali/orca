import { z } from 'zod'
import { ClientUiWorkspaceFilterFields } from './client-ui-workspace-filter-fields-params'

// Fork-only sidebar UI fields, kept beside client-ui-params.ts so upstream syncs merge cleanly.
export const ClientUiForkSidebarFields = {
  ...ClientUiWorkspaceFilterFields,
  showWorkspaceHostSections: z.boolean().optional(),
  dismissedIdleProjectsKey: z.string().nullable().optional(),
  dismissedClientSuggestionsKey: z.string().nullable().optional()
}
