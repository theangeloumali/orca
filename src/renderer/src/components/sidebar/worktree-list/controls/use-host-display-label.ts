import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'

/** One machine's display name (your rename first); a string, so it re-renders only when it changes. */
export function useHostDisplayLabel(hostId: ExecutionHostId): string {
  const t = useTranslate()
  return useAppStore((s) => selectExecutionHostDisplayLabel(s, hostId, { t }))
}
