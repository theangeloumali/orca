import { memo } from 'react'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ChevronRight, FolderTree, Pin } from 'lucide-react-native'
import { DisclosureChevron } from '../../components/list/DisclosureChevron'
import { MobileRepoIcon } from '../../components/icons/MobileRepoIcon'
import { WORKTREE_ROW_LAYOUT } from '../../worktree/row-presentation/worktree-list-row-layout'
import { colors } from '../../theme/mobile-theme'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import type { Section } from '../../worktree/workspace-list/workspace-list-types'
import { hostScreenStyles as styles } from '../host-screen-styles'
import type { RepoLook } from '../catalog/host-repo-looks'
import { HostPendingCreationRow } from './host-pending-creation-row'
import { projectGroupHeaderIndent } from '../../worktree/project-sections/project-group-indent'

// Takes the header's own fields, not the section, so a poll that rebuilds sections skips unchanged headers.
export const HostSectionHeader = memo(function HostSectionHeader(props: {
  title: string
  icon: Section['icon']
  isProjectGroup: boolean | undefined
  projectGroupDepth: number | undefined
  pendingCreations: Section['pendingCreations']
  collapseKey: string
  collapsed: boolean
  count: number
  pending: boolean
  groupByRepo: boolean
  repoLook: RepoLook | null | undefined
  onToggle: (collapseKey: string) => void
  /** A group's folded summary; shown in place of the count while folded. */
  foldProjects?: number
  foldNeedsYou?: number
  /** The keys beneath a group; a long press folds or unfolds them all. */
  subtreeKeys?: readonly string[]
  onToggleSubtree?: (keys: readonly string[]) => void
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { subtreeKeys, onToggleSubtree } = props
  const foldSummary =
    props.collapsed && props.foldProjects !== undefined
      ? [
          props.foldProjects === 1
            ? t('hostScreen.groupFold.projects_one', '{{count}} project', { count: 1 })
            : t('hostScreen.groupFold.projects_other', '{{count}} projects', {
                count: props.foldProjects
              }),
          !props.foldNeedsYou
            ? null
            : props.foldNeedsYou === 1
              ? t('hostScreen.groupFold.needsYou_one', '{{count}} needs you', { count: 1 })
              : t('hostScreen.groupFold.needsYou_other', '{{count}} need you', {
                  count: props.foldNeedsYou
                })
        ]
      : null
  const pendingCreations = props.pendingCreations?.map((creation) => (
    <HostPendingCreationRow key={creation.key} creation={creation} />
  ))
  if (!props.title) {
    return pendingCreations ? <>{pendingCreations}</> : null
  }
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.sectionHeader,
          props.projectGroupDepth
            ? {
                paddingLeft:
                  WORKTREE_ROW_LAYOUT.indicatorInset +
                  projectGroupHeaderIndent(props.projectGroupDepth)
              }
            : null,
          pressed && { backgroundColor: colors.translucentFill }
        ]}
        onPress={() => props.onToggle(props.collapseKey)}
        onLongPress={
          subtreeKeys?.length && onToggleSubtree ? () => onToggleSubtree(subtreeKeys) : undefined
        }
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityState={{ expanded: !props.collapsed }}
        accessibilityHint={
          subtreeKeys?.length
            ? t('hostScreen.groupFold.hint', 'Long press to fold or unfold everything inside.')
            : undefined
        }
      >
        <View style={styles.sectionChevron}>
          <DisclosureChevron expanded={!props.collapsed} collapsedDeg={0} expandedDeg={90}>
            <ChevronRight size={12} color={colors.textMuted} />
          </DisclosureChevron>
        </View>
        {props.icon === 'pin' && (
          <Pin size={12} color={colors.textMuted} style={styles.sectionIcon} />
        )}
        {props.groupByRepo && props.isProjectGroup ? (
          <FolderTree size={12} color={colors.textPrimary} style={styles.sectionIcon} />
        ) : props.groupByRepo ? (
          <View style={styles.sectionRepoIcon}>
            <MobileRepoIcon
              repoIcon={props.repoLook?.icon ?? null}
              size={14}
              color={props.repoLook?.color ?? colors.textSecondary}
            />
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>{props.title}</Text>
        {foldSummary?.[1] ? (
          // Amber marks it; the words keep the count color so they stay AA-legible.
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginRight: 4,
              backgroundColor: colors.statusAmber
            }}
          />
        ) : null}
        {foldSummary ? (
          <Text style={styles.sectionCount} numberOfLines={1}>
            {foldSummary[0]}
            {foldSummary[1] ? ` · ${foldSummary[1]}` : null}
          </Text>
        ) : (
          <Text style={styles.sectionCount}>{props.count}</Text>
        )}
        {props.pending && (
          <ActivityIndicator
            size="small"
            color={colors.textMuted}
            style={styles.sectionPendingSpinner}
          />
        )}
      </Pressable>
      {pendingCreations}
    </>
  )
})
