import React, { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useTranslate } from '@/i18n/use-translate'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import type { ClientSuggestion } from '../../../../../../shared/project/groups/client-suggestions'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getGroupCheckState } from './client-grouping-selection'

function SuggestedProjectRow({
  project,
  checked,
  disabled,
  onToggle
}: {
  project: Repo
  checked: boolean
  disabled: boolean
  onToggle: () => void
}): React.JSX.Element {
  const id = useId()
  return (
    <li className="flex min-w-0 items-start gap-2 py-1 pr-3 pl-8">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-describedby={`${id}-path`}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={id} variant="dialog" className="min-w-0">
          <span className="truncate">{project.displayName}</span>
        </Label>
        <span
          id={`${id}-path`}
          className="truncate text-[11px] leading-4 text-muted-foreground"
          title={project.path}
        >
          {project.path}
        </span>
      </div>
    </li>
  )
}

/** One proposed client group: a tri-state group checkbox over its projects' checkboxes. */
export function ClientSuggestionCard({
  suggestion,
  selected,
  disabled,
  onToggleGroup,
  onToggleProject
}: {
  suggestion: ClientSuggestion
  selected: ReadonlySet<string>
  disabled: boolean
  onToggleGroup: () => void
  onToggleProject: (project: Repo) => void
}): React.JSX.Element {
  const t = useTranslate()
  const groupId = useId()
  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <Checkbox
          id={groupId}
          checked={getGroupCheckState(suggestion.projects, selected)}
          disabled={disabled}
          onCheckedChange={onToggleGroup}
        />
        <Label id={`${groupId}-label`} htmlFor={groupId} className="min-w-0 flex-1">
          <span className="truncate">{suggestion.clientName}</span>
        </Label>
        <Badge variant="secondary">
          {suggestion.existingGroupId
            ? t('auto.components.sidebar.ClientGroupingSheet.existingGroup', 'Existing group')
            : t('auto.components.sidebar.ClientGroupingSheet.newGroup', 'New group')}
        </Badge>
      </div>
      <ul
        role="group"
        aria-labelledby={`${groupId}-label`}
        className="flex flex-col border-t border-border py-1"
      >
        {suggestion.projects.map((project) => (
          <SuggestedProjectRow
            key={getRepoRowIdentity(project)}
            project={project}
            checked={selected.has(getRepoRowIdentity(project))}
            disabled={disabled}
            onToggle={() => onToggleProject(project)}
          />
        ))}
      </ul>
    </div>
  )
}
