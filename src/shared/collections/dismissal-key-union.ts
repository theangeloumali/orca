/** Unions newline-joined identity keys, sorted; null when none remain. */
export function unionDismissalKeys(...keys: (string | null | undefined)[]): string | null {
  const identities = new Set(keys.flatMap((key) => key?.split('\n') ?? []).filter(Boolean))
  return identities.size > 0 ? [...identities].sort().join('\n') : null
}
