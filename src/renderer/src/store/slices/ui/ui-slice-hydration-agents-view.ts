import type { PersistedUIState } from '../../../../../shared/orca-profiles/persisted-ui-state-types'
import type { UISlice } from './ui-slice-contract'

type AgentsViewToggles = Pick<
  UISlice,
  | 'agentsHideWorkspacesFromOtherDevices'
  | 'agentsHideAutomationGeneratedWorkspaces'
  | 'agentsHideCliCreatedWorkspaces'
  | 'agentsShowChildAgents'
  | 'agentsCompactMode'
  | 'agentsShowSearch'
>

/** Agents view on/off switches; absent keys keep each switch's shipped default. */
export function hydrateAgentsViewToggles(ui: PersistedUIState): AgentsViewToggles {
  return {
    agentsHideWorkspacesFromOtherDevices: ui.agentsHideWorkspacesFromOtherDevices === true,
    agentsHideAutomationGeneratedWorkspaces: ui.agentsHideAutomationGeneratedWorkspaces === true,
    agentsHideCliCreatedWorkspaces: ui.agentsHideCliCreatedWorkspaces === true,
    agentsShowChildAgents: ui.agentsShowChildAgents === true,
    agentsCompactMode: ui.agentsCompactMode !== false,
    agentsShowSearch: ui.agentsShowSearch !== false
  }
}
