import { hexToRgba } from '../../../../src/shared/color/rgba-contrast'
import type { SessionHighlight } from '../../../../src/shared/worktree/row-display/session-highlight'

export type RowHighlightStyle = {
  backgroundColor: string
  borderLeftColor: string
  borderLeftWidth: number
}

const TINT_ALPHA = 0.12

/** A live row's tint and rail: working in its machine's color, needs-you always amber, as on the desktop. */
export function rowSessionHighlightStyle(
  highlight: SessionHighlight | undefined,
  machineColor: string | null,
  fallback: { working: string; needsYou: string }
): RowHighlightStyle | null {
  if (!highlight) {
    return null
  }
  const color = highlight === 'working' ? (machineColor ?? fallback.working) : fallback.needsYou
  return {
    backgroundColor: hexToRgba(color, TINT_ALPHA),
    borderLeftColor: color,
    borderLeftWidth: 3
  }
}
