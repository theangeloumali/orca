import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors } from '../../theme/mobile-theme'
import { hostScreenStyles as styles } from '../host-screen-styles'

function Badge({ color, count }: { color: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  )
}

/** A project header's live agents: working in blue, waiting on you in amber, as on the desktop. */
export function HostProjectActivityBadges({
  working,
  needsYou
}: {
  working: number
  needsYou: number
}) {
  const t = useMobileTranslation()
  if (working === 0 && needsYou === 0) {
    return null
  }
  return (
    <View
      accessible
      accessibilityLabel={t(
        'hostScreen.projectActivity.label',
        '{{working}} working, {{needsYou}} waiting on you',
        { working, needsYou }
      )}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}
    >
      {working > 0 ? <Badge color={colors.accentBlue} count={working} /> : null}
      {needsYou > 0 ? <Badge color={colors.statusAmber} count={needsYou} /> : null}
    </View>
  )
}
