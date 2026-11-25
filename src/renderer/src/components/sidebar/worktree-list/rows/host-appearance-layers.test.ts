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
  // Tailwind declares theme, base, components, utilities: unlayered CSS beats every bg-* utility,
  // and the components layer loses to all of them.
  it('keeps row tints under Tailwind utilities, so drag-over still beats the row tint', () => {
    expect(mainCss).toContain("@import 'tailwindcss'")
    const unlayered = outsideComponentsLayer(hostCss)
    for (const rowTint of ["[data-host-tint='strong']", "[data-group-tint='strong']"]) {
      expect(hostCss).toContain(rowTint)
      expect(unlayered).not.toContain(rowTint)
    }
  })

  it("keeps the host header's tint unlayered, so it beats the header's resting background utility", () => {
    const unlayered = outsideComponentsLayer(hostCss)
    expect(cssRuleBody(unlayered, '[data-host-header-color][data-host-header-tinted]')).toMatch(
      /background-color/
    )
    expect(cssRuleBody(unlayered, '[data-host-header-color]')).toMatch(/border-left/)
    expect(unlayered.match(/background-color/g)).toHaveLength(1)
  })

  it('clears a colored group set to Off, so the device wash does not show through', () => {
    expect(cssRuleBody(hostCss, "[data-group-tint='off']")).toMatch(/background-color: transparent/)
    expect(hostCss.indexOf("[data-group-tint='off']")).toBeGreaterThan(
      hostCss.indexOf("[data-host-tint='strong']")
    )
  })
})
