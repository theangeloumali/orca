import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cssRuleBody, mainCss } from '../../../../assets/main-css-tokens.test-fixture'

const hostCss = readFileSync(new URL('./host-appearance.css', import.meta.url), 'utf8')
const LAYER_OPEN = '@layer components {'

// The CSS left after removing the components layer block.
function outsideComponentsLayer(css: string): string {
  const start = css.indexOf(LAYER_OPEN)
  if (start === -1) {
    return css
  }
  let depth = 0
  for (let index = start + LAYER_OPEN.length - 1; index < css.length; index += 1) {
    depth += css[index] === '{' ? 1 : css[index] === '}' ? -1 : 0
    if (depth === 0) {
      return css.slice(0, start) + css.slice(index + 1)
    }
  }
  return css
}

describe('sidebar color layering', () => {
  it('keeps tints below Tailwind utilities, so drag-over, dragging and reveal backgrounds win', () => {
    // Tailwind declares theme, base, components, utilities; an unlayered rule would beat bg-* utilities.
    expect(mainCss).toContain("@import 'tailwindcss'")
    expect(hostCss).toContain(LAYER_OPEN)
    expect(outsideComponentsLayer(hostCss)).not.toMatch(/background-color/)
  })

  it('clears a colored group set to Off, so the device wash does not show through', () => {
    expect(cssRuleBody(hostCss, "[data-group-tint='off']")).toMatch(/background-color: transparent/)
    expect(hostCss.indexOf("[data-group-tint='off']")).toBeGreaterThan(
      hostCss.indexOf("[data-host-tint='strong']")
    )
  })
})
