import { useEffect } from 'react'
import { useAppStore } from '@/store/index'
import { addAppKeyListener, removeAppKeyListener } from '@/lib/keyboard/app-keyboard-router'
import { getShortcutPlatform } from '@/lib/keyboard/shortcut-platform'
import { keybindingMatchesAction } from '../../../../../../shared/keybindings/matching'

const ACTION_ID = 'sidebar.find'
// Cmd+F belongs to the sidebar only while focus is inside it; elsewhere editors and terminals own it.
const SIDEBAR_SCOPE = '[data-worktree-sidebar], [data-sidebar-quick-filters]'

export function useSidebarFindShortcut(onFind: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.key === 'Process') {
        return
      }
      const inSidebar = event.target instanceof Element && event.target.closest(SIDEBAR_SCOPE)
      const { keybindings } = useAppStore.getState()
      if (
        !inSidebar ||
        !keybindingMatchesAction(ACTION_ID, event, getShortcutPlatform(), keybindings)
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onFind()
    }
    addAppKeyListener('keydown', onKeyDown)
    return () => removeAppKeyListener('keydown', onKeyDown)
  }, [onFind])
}
