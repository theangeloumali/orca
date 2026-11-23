function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** "account · host" for a connected server; null when neither is known. */
export function giteaConnectedSummary(
  account: string | null,
  baseUrl: string | null
): string | null {
  const parts = [account, baseUrl ? hostOf(baseUrl) : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
