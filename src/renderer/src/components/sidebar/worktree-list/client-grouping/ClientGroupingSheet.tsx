import React, { useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import { useAppStore } from '@/store'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import type { MachineClientSuggestions } from '../../../../../../shared/project/groups/client-suggestions'
import { applyClientGroups, type ClientGroupPlan } from './apply-client-groups'
import { ClientSuggestionCard } from './ClientSuggestionCard'
import {
  getAllSuggestedIdentities,
  toggleGroupSelection,
  toggleProjectSelection
} from './client-grouping-selection'
import { useClientSuggestions } from './use-client-suggestions'

function buildPlans(
  sections: readonly MachineClientSuggestions[],
  selected: ReadonlySet<string>
): ClientGroupPlan[] {
  return sections.flatMap((section) =>
    section.suggestions.flatMap((suggestion) => {
      const projects = suggestion.projects.filter((entry) =>
        selected.has(getRepoRowIdentity(entry))
      )
      return projects.length > 0 ? [{ ...suggestion, hostId: section.hostId, projects }] : []
    })
  )
}

/** Review sheet for client groups per machine; nothing moves until Apply. */
export function ClientGroupingSheet(): React.JSX.Element {
  const t = useTranslate()
  const open = useAppStore((state) => state.clientGroupingSheetOpen)
  const setOpen = useAppStore((state) => state.setClientGroupingSheetOpen)
  const liveSections = useClientSuggestions()
  // Why a snapshot: each applied move regroups a project, which would drop it from live suggestions.
  const [sections, setSections] = useState(liveSections)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() =>
    getAllSuggestedIdentities(liveSections)
  )
  const [wasOpen, setWasOpen] = useState(open)
  const [applying, setApplying] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSections(liveSections)
      setSelected(getAllSuggestedIdentities(liveSections))
    }
  }
  const machineLabels = useAppStore(
    useShallow((state) =>
      sections.map((section) => selectExecutionHostDisplayLabel(state, section.hostId))
    )
  )
  const plans = buildPlans(sections, selected)
  const fileCount = plans.reduce((total, plan) => total + plan.projects.length, 0)

  const apply = async (): Promise<void> => {
    setApplying(true)
    try {
      const { createProjectGroup, moveProjectToGroup } = useAppStore.getState()
      const result = await applyClientGroups(plans, { createProjectGroup, moveProjectToGroup })
      if (result.filedCount > 0) {
        toast.success(
          t(
            'auto.components.sidebar.ClientGroupingSheet.filed',
            'Filed {{count}} projects by client',
            {
              count: result.filedCount,
              defaultValue_one: 'Filed {{count}} project by client'
            }
          )
        )
      }
      for (const clientName of result.failedGroups) {
        toast.error(
          t(
            'auto.components.sidebar.ClientGroupingSheet.groupFailed',
            'Could not file every project into {{name}}',
            { name: clientName }
          )
        )
      }
    } catch (error) {
      console.error('Failed to apply client groups:', error)
      toast.error(
        t(
          'auto.components.sidebar.ClientGroupingSheet.applyFailed',
          'Could not apply client groups'
        )
      )
    }
    // The catch never rethrows, so this runs on every path (no finally: the React compiler bails on it).
    setApplying(false)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (applying ? undefined : setOpen(next))}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {t('auto.components.sidebar.ClientGroupingSheet.title', 'Group by client')}
          </SheetTitle>
          <SheetDescription>
            {t(
              'auto.components.sidebar.ClientGroupingSheet.description',
              'Suggested from folder paths and GitHub owners, per machine. Nothing moves until you apply.'
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 scrollbar-sleek">
          {sections.length === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t(
                'auto.components.sidebar.ClientGroupingSheet.empty',
                'Nothing to suggest: every project is already grouped.'
              )}
            </p>
          ) : null}
          {sections.map((section, index) => (
            <section key={section.hostId} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                {machineLabels[index]}
              </h3>
              {section.suggestions.map((suggestion) => (
                <ClientSuggestionCard
                  key={suggestion.clientName}
                  suggestion={suggestion}
                  selected={selected}
                  disabled={applying}
                  onToggleGroup={() =>
                    setSelected((current) => toggleGroupSelection(suggestion.projects, current))
                  }
                  onToggleProject={(project) =>
                    setSelected((current) => toggleProjectSelection(project, current))
                  }
                />
              ))}
            </section>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border p-4">
          <span
            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
            aria-live="polite"
          >
            {t(
              'auto.components.sidebar.ClientGroupingSheet.summary',
              '{{count}} projects will be filed',
              { count: fileCount, defaultValue_one: '{{count}} project will be filed' }
            )}
          </span>
          <SheetClose asChild>
            <Button type="button" variant="outline" size="sm" disabled={applying}>
              {t('auto.components.sidebar.ClientGroupingSheet.cancel', 'Cancel')}
            </Button>
          </SheetClose>
          <Button
            type="button"
            size="sm"
            disabled={applying || plans.length === 0}
            onClick={() => void apply()}
          >
            {t('auto.components.sidebar.ClientGroupingSheet.apply', 'Apply {{count}} groups', {
              count: plans.length,
              defaultValue_one: 'Apply {{count}} group'
            })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
