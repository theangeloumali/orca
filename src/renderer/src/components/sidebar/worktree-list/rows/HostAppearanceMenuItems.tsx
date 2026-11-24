import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { useHostAppearanceControls } from './appearance-controls'
import { AppearanceMenuItems } from './AppearanceMenuItems'

/** Color and Background submenus for one host section; writes go to this computer's settings. */
export function HostAppearanceMenuItems({
  hostId,
  onCustomColor
}: {
  hostId: ExecutionHostId
  onCustomColor: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <AppearanceMenuItems
      controls={useHostAppearanceControls(hostId)}
      autoLabel={t('auto.components.sidebar.HostSectionHeaderMenu.colorAuto', 'Automatic')}
      swatchLabel={(color) =>
        t(
          'auto.components.sidebar.HostSectionHeaderMenu.colorSwatch',
          'Use {{color}} for this device',
          {
            color
          }
        )
      }
      onCustomColor={onCustomColor}
    />
  )
}
