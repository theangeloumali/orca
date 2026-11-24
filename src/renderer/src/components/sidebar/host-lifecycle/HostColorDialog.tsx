import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { setHostColor } from '../../../../../shared/execution-host/host-appearance'

type HostColorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  hostId: ExecutionHostId
  /** The color the section shows now, so the picker starts from it. */
  currentColor: string
}

// A popover inside a dropdown closes the menu on first click, so the custom picker lives in a dialog.
export function HostColorDialog({
  open,
  onOpenChange,
  hostId,
  currentColor
}: HostColorDialogProps): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)

  const applyColor = (color: string): void => {
    const settings = useAppStore.getState().settings
    void updateSettings({ hostSettingOverrides: setHostColor(settings, hostId, color) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('auto.components.sidebar.HostColorDialog.title', 'Custom device color')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'auto.components.sidebar.HostColorDialog.description',
              'Colors are saved only on this computer.'
            )}
          </DialogDescription>
        </DialogHeader>
        <ColorPicker
          value={currentColor}
          onChange={applyColor}
          label={t('auto.components.sidebar.HostColorDialog.pickerLabel', 'Device color')}
          showHexInTrigger
        />
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('auto.components.sidebar.HostColorDialog.done', 'Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
