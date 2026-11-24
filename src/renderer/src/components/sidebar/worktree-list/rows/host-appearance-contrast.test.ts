import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REPO_COLORS } from '../../../../../../shared/repository/appearance/repo-badge-color'
import { contrastRatio, mix, type Rgba } from '../../../../../../shared/color/rgba-contrast'
import {
  builtInThemeTokens,
  cssRuleBody,
  mainCss,
  parseColor
} from '../../../../assets/main-css-tokens.test-fixture'
import {
  HOST_TINT_LEVELS,
  HOST_TINT_TARGETS,
  SELECTED_MUTED_LIFT,
  SIDEBAR_CONTRAST_THEMES,
  hostTintPercents,
  type HostTintLevel
} from '../../../../../../shared/execution-host/host-tint-contrast'

const AA_BODY_TEXT = 4.5
const hostCss = readFileSync(new URL('./host-appearance.css', import.meta.url), 'utf8')
const ruleBody = (selector: string): string => cssRuleBody(hostCss, selector)

// The percent a host-colored rule falls back to when its row sets no per-color tint.
function fallbackPercent(selector: string, level: HostTintLevel): number {
  const pattern = new RegExp(`var\\(--host-tint-${level}, (\\d+)%\\)`)
  return Number(pattern.exec(ruleBody(selector))?.[1])
}

function fixedPercent(selector: string): number {
  return Number(
    /color-mix\(in srgb, var\([\w-]+\) (\d+)%, transparent\)/.exec(ruleBody(selector))?.[1]
  )
}

function selectedWashPercent(dark: boolean): number {
  const opener = `${dark ? '.dark ' : ''}[data-worktree-card-surface][data-worktree-card-active='primary'] {`
  const body = mainCss.slice(mainCss.indexOf(opener), mainCss.indexOf('}', mainCss.indexOf(opener)))
  return Number(/--worktree-sidebar-foreground\) (\d+)%, transparent/.exec(body)?.[1])
}

function selectedMutedLift(): number {
  const lift =
    /--muted-foreground: color-mix\(\s*in srgb,\s*var\(--worktree-sidebar-foreground\) (\d+)%,\s*var\(--worktree-sidebar\)\s*\)/.exec(
      hostCss
    )
  return Number(lift?.[1])
}

const SELECTORS: Record<HostTintLevel, string> = {
  header: '[data-host-header-color][data-host-header-tinted]',
  subtle: "[data-host-tint='subtle']",
  strong: "[data-host-tint='strong']",
  working: "[data-worktree-item-row]:has([data-session-highlight='working'])"
}
const NEEDS_YOU = "[data-worktree-item-row]:has([data-session-highlight='needs-you'])"
const WORST_CASE_CUSTOM = ['#ff0000', '#000000', '#ffffff', '#00ff00']
const HOST_COLORS = [...REPO_COLORS, ...WORST_CASE_CUSTOM]

describe('device color tints keep muted text at WCAG AA', () => {
  it('rules fall back to each level target and lift muted text by the shared share', () => {
    for (const level of HOST_TINT_LEVELS) {
      expect(fallbackPercent(SELECTORS[level], level)).toBe(HOST_TINT_TARGETS[level])
    }
    expect(selectedMutedLift()).toBe(SELECTED_MUTED_LIFT)
  })

  for (const dark of [false, true]) {
    const tokens = builtInThemeTokens(dark)
    const surface = parseColor(tokens.get('--worktree-sidebar') ?? '', tokens)
    const muted = parseColor(tokens.get('--muted-foreground') ?? '', tokens)
    const foreground = parseColor(tokens.get('--worktree-sidebar-foreground') ?? '', tokens)
    const liftedMuted = mix(foreground, surface, selectedMutedLift())
    const wash = selectedWashPercent(dark)
    const readable = (color: Rgba, percent: number, selectable: boolean): number[] => {
      const tinted = mix(color, surface, percent)
      const plain = contrastRatio(muted, tinted)
      return selectable
        ? [plain, contrastRatio(liftedMuted, mix(foreground, tinted, wash))]
        : [plain]
    }
    const theme = dark ? 'dark' : 'light'

    it(`${theme} shared sidebar tokens match main.css`, () => {
      const shared = SIDEBAR_CONTRAST_THEMES[dark ? 1 : 0]
      expect([shared.surface, shared.muted, shared.foreground]).toEqual([
        surface,
        muted,
        foreground
      ])
      expect(shared.selected).toEqual([foreground[0], foreground[1], foreground[2], wash / 100])
    })

    for (const level of HOST_TINT_LEVELS) {
      it(`${theme} ${level} stays AA for presets and worst-case custom colors`, () => {
        const ratios = HOST_COLORS.flatMap((color) =>
          readable(parseColor(color, tokens), hostTintPercents(color)[level], level !== 'header')
        )
        expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
      })
    }

    it(`${theme} uncolored working and needs-you rows stay AA`, () => {
      const working = parseColor('var(--agent-working)', tokens)
      const question = parseColor('var(--agent-question)', tokens)
      const ratios = [
        ...readable(working, fallbackPercent(SELECTORS.working, 'working'), true),
        ...readable(question, fixedPercent(NEEDS_YOU), true)
      ]
      expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
    })
  }
})
