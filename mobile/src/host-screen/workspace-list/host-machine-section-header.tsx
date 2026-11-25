import { memo } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { DisclosureChevron } from '../../components/list/DisclosureChevron'
import { hexToRgba } from '../../../../src/shared/color/rgba-contrast'
import { colors } from '../../theme/mobile-theme'
import { ColorDot } from '../../components/feedback/ColorDot'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { MachineSectionHeader } from '../../worktree/workspace-list/workspace-list-types'
import { hostScreenStyles as styles } from '../host-screen-styles'

const MIN_TOUCH = 44

function tintBackground(color: string | null, percent: number): string | undefined {
  if (!color || percent <= 0) {
    return undefined
  }
  return hexToRgba(color, percent / 100)
}

/** One computer's header: color, name, workspace count and reachability; the first also folds them all. */
export const HostMachineSectionHeader = memo(function HostMachineSectionHeader(props: {
  machine: MachineSectionHeader
  pending: boolean
  onToggle: (collapseKey: string) => void
  /** Only on the first machine header. */
  collapseAll: { allCollapsed: boolean; onPress: () => void } | null
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { machine } = props
  const railColor = machine.color ?? colors.textMuted
  const status =
    machine.status === 'online'
      ? t('hostScreen.machineHeader.online', 'Online')
      : machine.status === 'offline'
        ? t('hostScreen.machineHeader.offline', 'Offline')
        : null
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tintBackground(machine.color, machine.tintPercent),
        borderLeftWidth: 3,
        borderLeftColor: railColor
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[machine.label, String(machine.count), status]
          .filter(Boolean)
          .join(', ')}
        accessibilityState={{ expanded: !machine.collapsed }}
        style={({ pressed }) => [
          styles.sectionHeader,
          { flex: 1, minHeight: MIN_TOUCH },
          pressed && { backgroundColor: colors.translucentFill }
        ]}
        onPress={() => props.onToggle(`host:${machine.hostId}`)}
      >
        <View style={styles.sectionChevron}>
          <DisclosureChevron expanded={!machine.collapsed} collapsedDeg={0} expandedDeg={90}>
            <ChevronRight size={12} color={colors.textMuted} />
          </DisclosureChevron>
        </View>
        <ColorDot color={railColor} size={8} style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {machine.label}
        </Text>
        <Text style={styles.sectionCount}>{machine.count}</Text>
        {status && (
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{status}</Text>
        )}
        {props.pending && (
          <ActivityIndicator
            size="small"
            color={colors.textMuted}
            style={styles.sectionPendingSpinner}
          />
        )}
      </Pressable>
      {props.collapseAll && (
        <Pressable
          accessibilityRole="button"
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: 12 }}
          onPress={props.collapseAll.onPress}
        >
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {props.collapseAll.allCollapsed
              ? t('hostScreen.machineHeader.expandAll', 'Expand all')
              : t('hostScreen.machineHeader.collapseAll', 'Collapse all')}
          </Text>
        </Pressable>
      )}
    </View>
  )
})
