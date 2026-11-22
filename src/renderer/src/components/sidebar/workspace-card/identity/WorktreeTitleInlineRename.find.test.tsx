// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import { WorktreeTitleInlineRename } from './WorktreeTitleInlineRename'

describe('WorktreeTitleInlineRename find highlight', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('marks find matches only where the sidebar row asks for it', () => {
    useAppStore.setState({ sidebarFindQuery: 'api' })
    const plain = render(
      <WorktreeTitleInlineRename displayName="api-gateway" onRename={() => {}} />
    )
    expect(plain.container.querySelector('mark')).toBeNull()
    cleanup()
    const row = render(
      <WorktreeTitleInlineRename
        displayName="api-gateway"
        highlightFindMatches
        onRename={() => {}}
      />
    )
    expect(row.container.querySelector('mark')?.textContent).toBe('api')
  })
})
