import React, { createContext, use, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../../../shared/repository/appearance/repo-badge-color'
import { CustomColorDialog } from '../../CustomColorDialog'
import { useProjectGroupAppearanceControls, type ShownGroupColor } from './appearance-controls'

type GroupColorRequest = ShownGroupColor & { groupId: string }
type OpenGroupColorDialog = (request: GroupColorRequest) => void

const missingHost: OpenGroupColorDialog = () => {
  throw new Error('GroupColorDialogHost is not mounted')
}
const OpenGroupColorDialogContext = createContext<OpenGroupColorDialog>(missingHost)

export function useOpenGroupColorDialog(): OpenGroupColorDialog {
  return use(OpenGroupColorDialogContext)
}

/** Renders the custom group color dialog beside the list, so its portal events never reach a
 *  header's toggle, drag or key handlers, and scrolling the row away keeps it open. */
export function GroupColorDialogHost({
  children
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const [request, setRequest] = useState<GroupColorRequest | null>(null)
  return (
    <OpenGroupColorDialogContext value={setRequest}>
      {children}
      {request ? <GroupColorDialog request={request} onClose={() => setRequest(null)} /> : null}
    </OpenGroupColorDialogContext>
  )
}

function GroupColorDialog({
  request,
  onClose
}: {
  request: GroupColorRequest
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const { groupId, ...shown } = request
  const controls = useProjectGroupAppearanceControls(groupId, shown)
  return (
    <CustomColorDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      currentColor={shown.color ?? DEFAULT_REPO_BADGE_COLOR}
      title={t('auto.components.sidebar.WorktreeList.groupColorDialogTitle', 'Custom group color')}
      description={t(
        'auto.components.sidebar.WorktreeList.groupColorDialogDescription',
        'Group colors sync with the group; background strength stays on this computer.'
      )}
      pickerLabel={t('auto.components.sidebar.WorktreeList.groupColorPickerLabel', 'Group color')}
      onSave={controls.selectColor}
    />
  )
}
