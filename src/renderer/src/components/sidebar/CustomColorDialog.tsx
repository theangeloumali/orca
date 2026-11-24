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
import { useTranslate } from '@/i18n/use-translate'

type CustomColorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The color shown now, so the picker starts from it. */
  currentColor: string
  title: string
  description: string
  pickerLabel: string
  onSave: (color: string) => void
}

// A popover inside a dropdown closes the menu on first click, so the custom picker lives in a dialog.
export function CustomColorDialog({
  open,
  onOpenChange,
  currentColor,
  title,
  description,
  pickerLabel,
  onSave
}: CustomColorDialogProps): React.JSX.Element {
  const t = useTranslate()
  // Picks stay a draft so Cancel/Escape discards them; Done is the only save.
  const [draft, setDraft] = React.useState<string | null>(null)

  const close = (): void => {
    setDraft(null)
    onOpenChange(false)
  }

  const saveAndClose = (): void => {
    if (draft) {
      onSave(draft)
    }
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ColorPicker
          value={draft ?? currentColor}
          onChange={setDraft}
          label={pickerLabel}
          showHexInTrigger
        />
        <DialogFooter>
          <Button type="button" onClick={saveAndClose}>
            {t('auto.components.sidebar.HostColorDialog.done', 'Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
