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

/** Lowercased text plus, per lowered code unit, the original span it came from. */
function lowerWithOrigins(text: string): { lowered: string; starts: number[]; ends: number[] } {
  let lowered = ''
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0
  for (const char of text) {
    const lower = char.toLowerCase()
    for (let unit = 0; unit < lower.length; unit++) {
      starts.push(offset)
      ends.push(offset + char.length)
    }
    lowered += lower
    offset += char.length
  }
  return { lowered, starts, ends }
}

/** Every non-overlapping case-insensitive match of the query, as ranges on the original label. */
export function findQueryMatchRanges(text: string, query: string): FindMatchRange[] {
  const needle = normalizeFindQuery(query)
  if (needle === '') {
    return []
  }
  // Why: 'İ' lowercases to two units, so lowered offsets would drift from the label.
  const { lowered, starts, ends } = lowerWithOrigins(text)
  const ranges: FindMatchRange[] = []
  for (
    let at = lowered.indexOf(needle);
    at !== -1;
    at = lowered.indexOf(needle, at + needle.length)
  ) {
    ranges.push({ start: starts[at], end: ends[at + needle.length - 1] })
  }
  return ranges
}
