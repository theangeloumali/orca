import { describe, expect, it } from 'vitest'
import { REPO_COLORS } from '../../../../shared/repository/appearance/repo-badge-color'
import { contrastRatio, mix } from '../../../../shared/color/rgba-contrast'
import {
  builtInThemeTokens,
  cssRuleBody,
  mainCss,
  parseColor
} from '../../assets/main-css-tokens.test-fixture'

const AA_BODY_TEXT = 4.5
// Each pill rule and the titlebar surface it sits on.
const PILL_SURFACES = [
  { selector: '.titlebar-device-pill', surface: '--card' },
  {
    selector: '.titlebar-left:not(.titlebar-left-floating) .titlebar-device-pill',
    surface: '--worktree-sidebar'
  }
]

describe('titlebar device pill contrast', () => {
  for (const dark of [false, true]) {
    const tokens = builtInThemeTokens(dark)
    for (const { selector, surface } of PILL_SURFACES) {
      it(`${dark ? 'dark' : 'light'} ${surface} pill text stays AA for every preset`, () => {
        const body = cssRuleBody(mainCss, selector)
        const text = /(?:^|;)\s*color: (var\(--[\w-]+\))/.exec(body)?.[1] ?? ''
        const share = Number(/var\(--host-color\) (\d+)%, transparent/.exec(body)?.[1])
        const background = parseColor(`var(${surface})`, tokens)
        const ratios = REPO_COLORS.map((color) =>
          contrastRatio(parseColor(text, tokens), mix(parseColor(color, tokens), background, share))
        )
        expect(share).toBeGreaterThan(0)
        expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
      })
    }
  }
})
