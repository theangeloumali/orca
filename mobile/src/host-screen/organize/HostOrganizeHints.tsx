import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, radii, spacing } from '../../theme/mobile-theme'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import type { useHostOrganizeHints } from './use-host-organize-hints'

type OrganizeHints = ReturnType<typeof useHostOrganizeHints>

function HintCard(props: {
  title: string
  body: string
  action: string
  busy: boolean
  onAction: () => void
  onDismiss: () => void
}) {
  const t = useMobileTranslation()
  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.surface,
        backgroundColor: colors.bgRaised,
        gap: spacing.xs
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
        {props.title}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{props.body}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          onPress={props.onDismiss}
          disabled={props.busy}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {t('hostScreen.organize.notNow', 'Not now')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={props.onAction}
          disabled={props.busy}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md }}
        >
          {props.busy ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={{ color: colors.accentBlue, fontSize: 14, fontWeight: '600' }}>
              {props.action}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

/** The fork desktop's tidy-up offers: archive idle projects, file projects by client. */
export function HostOrganizeHints({ hints }: { hints: OrganizeHints }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { idle, clients } = hints
  return (
    <>
      {idle ? (
        <HintCard
          title={
            idle.repos.length === 1
              ? t('hostScreen.organize.idleTitle_one', '1 project idle for 30+ days')
              : t('hostScreen.organize.idleTitle_other', '{{count}} projects idle for 30+ days', {
                  count: idle.repos.length
                })
          }
          body={idle.repos.map((repo) => repo.displayName).join(', ')}
          action={t('hostScreen.organize.archive', 'Archive')}
          busy={hints.busy}
          onAction={() => void hints.archiveIdle()}
          onDismiss={() => void hints.dismiss('idle', idle.key)}
        />
      ) : null}
      {clients ? (
        <HintCard
          title={t('hostScreen.organize.clientsTitle', 'Group {{count}} projects by client', {
            count: clients.projectCount
          })}
          body={clients.suggestions
            .map((suggestion) => `${suggestion.clientName} (${suggestion.projects.length})`)
            .join(', ')}
          action={t('hostScreen.organize.group', 'Group')}
          busy={hints.busy}
          onAction={() => void hints.groupClients()}
          onDismiss={() => void hints.dismiss('clients', clients.key)}
        />
      ) : null}
    </>
  )
}
