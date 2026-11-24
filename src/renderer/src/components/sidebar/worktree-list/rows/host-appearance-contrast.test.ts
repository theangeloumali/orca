import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REPO_COLORS } from '../../../../../../shared/repository/appearance/repo-badge-color'
import {
  contrastRatio,
  hexToRgb,
  mix,
  type Rgba
} from '../../../../../../shared/color/rgba-contrast'
import {
  HOST_TINT_LEVELS,
  HOST_TINT_TARGETS,
  SELECTED_MUTED_LIFT,
  SIDEBAR_CONTRAST_THEMES,
  hostTintPercents,
  type HostTintLevel
} from '../../../../../../shared/execution-host/host-tint-contrast'

type Tokens = ReadonlyMap<string, string>

const AA_BODY_TEXT = 4.5
const readCss = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8')
const mainCss = readCss('../../../../assets/main.css')
const hostCss = readCss('./host-appearance.css').replace(/\/\*[\s\S]*?\*\//g, '')
const tailwindTheme = readCss('../../../../../../../node_modules/tailwindcss/theme.css')

function blockTokens(css: string, opener: string): Tokens {
  const start = css.indexOf(`\n${opener} {`)
  const body = css.slice(start, css.indexOf('}', start))
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value])
  )
}

const themeTokens: Tokens = new Map(
  [...tailwindTheme.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
    name,
    value
  ])
)

function oklchToRgb(l: number, c: number, h: number): Rgba {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lms = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b
  ].map((v) => v ** 3)
  const linear = [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2]
  ]
  const gamma = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
  const channel = (i: number): number => Math.min(1, Math.max(0, gamma(linear[i]))) * 255
  return [channel(0), channel(1), channel(2), 1]
}

function parseColor(value: string, tokens: Tokens): Rgba {
  const reference = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (reference) {
    return parseColor(tokens.get(reference[1]) ?? themeTokens.get(reference[1]) ?? '', tokens)
  }
  const oklch = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/.exec(value.trim())
  if (oklch) {
    return oklchToRgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]))
  }
  if (!/^#[\da-f]{6}$/i.test(value.trim())) {
    throw new Error(`unparsed color: ${value}`)
  }
  return hexToRgb(value.trim())
}

function ruleBody(selector: string): string {
  for (const [, ruleSelector, body] of hostCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (ruleSelector.trim() === selector) {
      return body
    }
  }
  throw new Error(`no rule for ${selector}`)
}

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
    // .dark only overrides; anything it leaves out cascades from :root.
    const root = blockTokens(mainCss, ':root')
    const tokens = dark ? new Map([...root, ...blockTokens(mainCss, '.dark')]) : root
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
      expect(shared.selectedWash).toBe(wash)
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
