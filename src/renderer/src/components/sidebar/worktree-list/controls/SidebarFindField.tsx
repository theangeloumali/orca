import { useEffect, useRef, type JSX } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'

type SidebarFindFieldProps = {
  query: string
  onQueryChange: (query: string) => void
  /** Escape in an empty field has nothing left to clear, so it closes find. */
  onClose: () => void
  /** Bumped by Cmd+F so a repeat press refocuses an already-open field. */
  focusRequest: number
}

export function SidebarFindField({
  query,
  onQueryChange,
  onClose,
  focusRequest
}: SidebarFindFieldProps): JSX.Element {
  const t = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusRequest])

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        name="sidebar-find"
        autoComplete="off"
        spellCheck={false}
        value={query}
        aria-label={t('auto.components.sidebar.quickFilters.findLabel', 'Find workspaces')}
        placeholder={t(
          'auto.components.sidebar.quickFilters.findPlaceholder',
          'Name, branch or project…'
        )}
        density="compact"
        inset="leadingIcon"
        adornment="trailing"
        className="[&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          // Composition Escape belongs to the IME.
          if (event.key !== 'Escape' || event.nativeEvent.isComposing) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          if (query !== '') {
            onQueryChange('')
            return
          }
          onClose()
        }}
      />
      {query !== '' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-0.5"
          aria-label={t('auto.components.sidebar.quickFilters.clearFind', 'Clear find')}
          // Keep focus in the field; clearing unmounts this button.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onQueryChange('')}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
