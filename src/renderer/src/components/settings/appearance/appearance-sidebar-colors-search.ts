import type { SettingsSearchEntry } from '../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'

/** Deep-link target the sidebar menus' "Edit all sidebar colors…" scrolls to. */
export const SIDEBAR_COLORS_SETTING_ID = 'sidebar-colors'

export const getSidebarColorsEntry = createLocalizedCatalog((): SettingsSearchEntry => ({
  title: translate(
    'auto.components.settings.appearance.search.sidebarColors.title',
    'Sidebar colors'
  ),
  description: translate(
    'auto.components.settings.appearance.search.sidebarColors.description',
    'Color devices and project groups in the sidebar. Group colors sync; background strength stays on this computer.'
  ),
  keywords: [
    ...translateSearchKeyword('auto.components.settings.appearance.search.5bff6a2ef0', 'sidebar'),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.sidebarColors.color',
      'color'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.sidebarColors.group',
      'group'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.sidebarColors.device',
      'device'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.leftSidebarAppearance.background',
      'background'
    )
  ]
}))
