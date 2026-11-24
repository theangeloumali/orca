import { Text, View } from 'react-native'
import type { ExecutionHostId } from '../../../../src/shared/execution-host/execution-host'
import { HostKindIcon } from '../../components/icons/HostKindIcon'
import { worktreeListRowStyles as styles } from './worktree-list-row-styles'

/** The computer a row runs on, as the desktop's workspace pill: its icon, name, and its word while down. */
export function HostContextPill({
  hostId,
  label,
  healthLabel,
  dotColor = null
}: {
  hostId: ExecutionHostId | undefined
  label: string | undefined
  healthLabel: string | undefined
  /** The machine's color, so the pill matches its section header. */
  dotColor?: string | null
}) {
  return (
    <View
      style={[styles.childBadge, styles.hostBadge]}
      accessibilityLabel={[label, healthLabel].filter(Boolean).join(', ')}
    >
      {dotColor ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
      ) : null}
      <HostKindIcon hostId={hostId} size={10} />
      {label ? (
        <Text style={[styles.childBadgeText, styles.hostBadgeText]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {/* Why separate Text: the name truncates first so the health word stays readable. */}
      {healthLabel ? (
        <Text style={[styles.childBadgeText, styles.hostHealthText]}>
          {label ? `· ${healthLabel}` : healthLabel}
        </Text>
      ) : null}
    </View>
  )
}
