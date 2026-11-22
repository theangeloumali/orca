/** Sidebar find text as the matcher compares it. */
export function normalizeFindQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** Whether any field contains an already-normalized query; an empty query matches everything. */
export function matchesFindQuery(fields: readonly string[], normalizedQuery: string): boolean {
  return (
    normalizedQuery === '' || fields.some((field) => field.toLowerCase().includes(normalizedQuery))
  )
}

export type FindMatchRange = { start: number; end: number }

/** Every non-overlapping case-insensitive match of the query in a label, for highlighting. */
export function findQueryMatchRanges(text: string, query: string): FindMatchRange[] {
  const needle = normalizeFindQuery(query)
  if (needle === '') {
    return []
  }
  const haystack = text.toLowerCase()
  const ranges: FindMatchRange[] = []
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + needle.length)
  ) {
    ranges.push({ start: at, end: at + needle.length })
  }
  return ranges
}
