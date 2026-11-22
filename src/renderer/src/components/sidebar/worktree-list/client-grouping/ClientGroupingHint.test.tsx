// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ClientGroupingHintRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import { ClientGroupingHint } from './ClientGroupingHint'

function hintRow(
  hostId: ExecutionHostId,
  suggestionsKey: string,
  projectCount = 3
): ClientGroupingHintRow {
  return {
    type: 'client-grouping-hint',
    key: `hint:${hostId}`,
    hostId,
    projectCount,
    suggestionsKey
  }
}

const uiSet = vi.fn(async () => undefined)

describe('ClientGroupingHint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(window, { api: { ui: { set: uiSet } } })
    useAppStore.setState({ dismissedClientSuggestionsKey: null, clientGroupingSheetOpen: false })
  })
  afterEach(cleanup)

  it("shows the row's count and opens the sheet", () => {
    render(<ClientGroupingHint row={hintRow('local', 'a', 5)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Group 5 ungrouped by client…' }))
    expect(useAppStore.getState().clientGroupingSheetOpen).toBe(true)
  })

  it("merges a dismissal on one machine with another machine's, so both stay dismissed", () => {
    render(<ClientGroupingHint row={hintRow('local', 'local-b\nlocal-a')} />)
    render(<ClientGroupingHint row={hintRow('ssh:box', 'box-a')} />)
    const [local, box] = screen.getAllByRole('button', {
      name: 'Dismiss client grouping suggestion'
    })
    fireEvent.click(local)
    fireEvent.click(box)
    const merged = 'box-a\nlocal-a\nlocal-b'
    expect(useAppStore.getState().dismissedClientSuggestionsKey).toBe(merged)
    expect(uiSet).toHaveBeenLastCalledWith({ dismissedClientSuggestionsKey: merged })
  })
})
