import React from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { setHostColor } from '../../../../../shared/execution-host/host-appearance'
import { CustomColorDialog } from '../CustomColorDialog'

type HostColorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostId: ExecutionHostId
  /** The color the section shows now, so the picker starts from it. */
  currentColor: string
}

export function HostColorDialog({
  open,
  onOpenChange,
  hostId,
  currentColor
}: HostColorDialogProps): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)

  const save = (color: string): void => {
    const settings = useAppStore.getState().settings
    void updateSettings({ hostSettingOverrides: setHostColor(settings, hostId, color) })
  }

  return (
    <CustomColorDialog
      open={open}
      onOpenChange={onOpenChange}
      currentColor={currentColor}
      title={t('auto.components.sidebar.HostColorDialog.title', 'Custom device color')}
      description={t(
        'auto.components.sidebar.HostColorDialog.description',
        'Colors are saved only on this computer.'
      )}
      pickerLabel={t('auto.components.sidebar.HostColorDialog.pickerLabel', 'Device color')}
      onSave={save}
    />
  )
}
