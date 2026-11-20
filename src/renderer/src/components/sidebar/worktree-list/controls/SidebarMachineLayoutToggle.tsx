import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'

type MachineLayout = 'machines' | 'projects'

/** Machines: one sidebar section per host; Projects: today's merged project list. */
export function SidebarMachineLayoutToggle(): React.JSX.Element {
  const t = useTranslate()
  const showMachineSections = useAppStore((s) => s.showWorkspaceHostSections)
  const setShowMachineSections = useAppStore((s) => s.setShowWorkspaceHostSections)
  const options: { id: MachineLayout; label: string }[] = [
    {
      id: 'machines',
      label: t('auto.components.sidebar.SidebarMachineLayoutToggle.machines', 'Machines')
    },
    {
      id: 'projects',
      label: t('auto.components.sidebar.SidebarMachineLayoutToggle.projects', 'Projects')
    }
  ]
  const choose = (layout: MachineLayout): void => setShowMachineSections(layout === 'machines')
  return (
    <ToggleGroup
      type="single"
      value={showMachineSections ? 'machines' : 'projects'}
      onValueChange={(value) => {
        if (value === 'machines' || value === 'projects') {
          choose(value)
        }
      }}
      variant="segmented-card"
      size="sm"
      aria-label={t('auto.components.sidebar.SidebarMachineLayoutToggle.label', 'Sidebar layout')}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          // Same pointer-intent capture as SidebarGroupByToggle: Radix roving focus can swallow the click.
          onPointerDownCapture={() => choose(option.id)}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
