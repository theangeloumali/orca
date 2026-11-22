import type { ExecutionHostId } from '../../execution-host/execution-host'

/** The renderer's offer, under an open machine header, to group its projects by client; the shared builder never emits it. */
export type ClientGroupingHintRow = {
  type: 'client-grouping-hint'
  key: string
  hostId: ExecutionHostId
  projectCount: number
  /** Identifies the suggested set, so a dismissal holds until a new project joins it. */
  suggestionsKey: string
}
