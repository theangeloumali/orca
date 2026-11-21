import { describe, expect, it, vi } from 'vitest'
import { toggleSectionHeaderCollapse } from './header-event-guards'

function handlers() {
  return {
    toggleGroupWithScrollAnchor: vi.fn(),
    toggleAllProjects: vi.fn(),
    toggleProjectGroupSubtree: vi.fn(() => true)
  }
}

describe('toggleSectionHeaderCollapse', () => {
  it('Alt-click on a group header toggles only that subtree', () => {
    const ctx = handlers()
    toggleSectionHeaderCollapse({ altKey: true }, 'project-group:work', ctx)
    expect(ctx.toggleProjectGroupSubtree).toHaveBeenCalledWith('work')
    expect(ctx.toggleAllProjects).not.toHaveBeenCalled()
    expect(ctx.toggleGroupWithScrollAnchor).not.toHaveBeenCalled()
  })

  it('Alt-click on a project header still toggles all projects', () => {
    const ctx = handlers()
    toggleSectionHeaderCollapse({ altKey: true }, 'project:api', ctx)
    expect(ctx.toggleAllProjects).toHaveBeenCalledOnce()
    expect(ctx.toggleProjectGroupSubtree).not.toHaveBeenCalled()
  })

  it('Alt-click on Ungrouped keeps toggling all projects', () => {
    const ctx = handlers()
    toggleSectionHeaderCollapse({ altKey: true }, 'project-group:ungrouped', ctx)
    expect(ctx.toggleProjectGroupSubtree).not.toHaveBeenCalled()
  })

  it('Alt-click on a group with nothing listed beneath falls back to all projects', () => {
    const ctx = { ...handlers(), toggleProjectGroupSubtree: vi.fn(() => false) }
    toggleSectionHeaderCollapse({ altKey: true }, 'project-group:empty', ctx)
    expect(ctx.toggleProjectGroupSubtree).toHaveBeenCalledWith('empty')
    expect(ctx.toggleAllProjects).toHaveBeenCalledOnce()
    expect(ctx.toggleGroupWithScrollAnchor).not.toHaveBeenCalled()
  })

  it('a plain click folds only the clicked group', () => {
    const ctx = handlers()
    toggleSectionHeaderCollapse({ altKey: false }, 'project-group:work', ctx)
    expect(ctx.toggleGroupWithScrollAnchor).toHaveBeenCalledWith('project-group:work')
    expect(ctx.toggleProjectGroupSubtree).not.toHaveBeenCalled()
  })
})
