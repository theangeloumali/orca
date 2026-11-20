import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../execution-host/execution-host'
import type { HostSectionOption } from './host-section-rows'

/** A section for a host that has rows but no registered option, e.g. one removed mid-session. */
export function getFallbackHost(
  hostId: ExecutionHostId,
  localHostLabel: string
): HostSectionOption {
  const isLocal = hostId === LOCAL_EXECUTION_HOST_ID
  return {
    id: hostId,
    kind: isLocal ? 'local' : hostId.startsWith('ssh:') ? 'ssh' : 'runtime',
    label: isLocal ? localHostLabel : hostId,
    isDefaultLocalLabel: isLocal,
    detail: isLocal ? 'This computer' : 'Host',
    health: isLocal ? 'local' : 'available'
  }
}
