import { describe, expect, it } from 'vitest'
import { findQueryMatchRanges, matchesFindQuery, normalizeFindQuery } from './workspace-find-query'

describe('workspace find query', () => {
  it('normalizes case and surrounding space', () => {
    expect(normalizeFindQuery('  API ')).toBe('api')
  })

  it('matches any field case-insensitively', () => {
    expect(matchesFindQuery(['Checkout', 'feature/Login', 'Web App'], 'login')).toBe(true)
    expect(matchesFindQuery(['Checkout', 'main', 'Web App'], 'login')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesFindQuery(['anything'], '')).toBe(true)
  })

  it('returns every match range for highlighting', () => {
    expect(findQueryMatchRanges('Api api', 'API')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 }
    ])
    expect(findQueryMatchRanges('Api', '  ')).toEqual([])
  })

  it('keeps ranges on the original text when lowercasing changes its length', () => {
    // 'İ' lowercases to two code units, which would shift every later range.
    const text = 'İstanbul api'
    const [range] = findQueryMatchRanges(text, 'api')
    expect(text.slice(range.start, range.end)).toBe('api')
    expect(findQueryMatchRanges('İ', 'i')).toEqual([{ start: 0, end: 1 }])
  })
})
