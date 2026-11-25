import { app } from 'electron'
import { translateMain } from '../i18n/main-i18n'
import { IS_ORCA_DEV_APP } from '../startup/dev-app/orca-dev-app'

/** Orca Dev never self-updates; its launch sync pulls from Orca, so refreshing is a relaunch. */
export function resolveUpdateMenuItem(
  updateItem: Electron.MenuItemConstructorOptions
): Electron.MenuItemConstructorOptions {
  if (!IS_ORCA_DEV_APP) {
    return updateItem
  }
  return {
    label: translateMain('menu.refreshFromOrca', 'Refresh from Orca'),
    click: () => {
      app.relaunch()
      app.quit()
    }
  }
}
