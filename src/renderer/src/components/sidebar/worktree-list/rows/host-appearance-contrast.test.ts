import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REPO_COLORS } from '../../../../../../shared/repository/appearance/repo-badge-color'

type Rgb = readonly [number, number, number]
type Tokens = ReadonlyMap<string, string>

const AA_BODY_TEXT = 4.5
const readCss = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8')
const mainCss = readCss('../../../../assets/main.css')
const hostCss = readCss('./host-appearance.css')
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

const rgb = (channel: (index: number) => number): Rgb => [channel(0), channel(1), channel(2)]

function oklchToRgb(l: number, c: number, h: number): Rgb {
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
  return rgb((i) => Math.min(1, Math.max(0, gamma(linear[i]))) * 255)
}

function parseColor(value: string, tokens: Tokens): Rgb {
  const reference = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (reference) {
    return parseColor(tokens.get(reference[1]) ?? themeTokens.get(reference[1]) ?? '', tokens)
  }
  const oklch = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/.exec(value.trim())
  if (oklch) {
    return oklchToRgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]))
  }
  const hex = /^#([\da-f]{6})$/i.exec(value.trim())
  if (!hex) {
    throw new Error(`unparsed color: ${value}`)
  }
  return rgb((i) => Number.parseInt(hex[1].slice(i * 2, i * 2 + 2), 16))
}

const mix = (top: Rgb, bottom: Rgb, percent: number): Rgb =>
  rgb((i) => top[i] * (percent / 100) + bottom[i] * (1 - percent / 100))

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Each tinted rule's percentage, keyed by selector, read from the stylesheet itself.
function tintPercent(selector: string): number {
  const uncommented = hostCss.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, ruleSelector, body] of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const percent = /color-mix\(in srgb, .+? (\d+)%, transparent\)/.exec(body)
    if (ruleSelector.trim() === selector && percent) {
      return Number(percent[1])
    }
  }
  throw new Error(`no tint for ${selector}`)
}

function selectedWashPercent(dark: boolean): number {
  const opener = `${dark ? '.dark ' : ''}[data-worktree-card-surface][data-worktree-card-active='primary'] {`
  const body = mainCss.slice(mainCss.indexOf(opener), mainCss.indexOf('}', mainCss.indexOf(opener)))
  return Number(/--worktree-sidebar-foreground\) (\d+)%, transparent/.exec(body)?.[1])
}

// Muted text on a tinted, selected card is lifted toward the foreground by this share.
function selectedMutedLift(): number {
  const lift =
    /--muted-foreground: color-mix\(\s*in srgb,\s*var\(--worktree-sidebar-foreground\) (\d+)%,\s*var\(--worktree-sidebar\)\s*\)/.exec(
      hostCss
    )
  return Number(lift?.[1])
}

const HOST_COLORS = REPO_COLORS.map((color) => parseColor(color, new Map()))

describe('device color tints keep muted text at WCAG AA', () => {
  for (const dark of [false, true]) {
    // .dark only overrides; anything it leaves out cascades from :root.
    const root = blockTokens(mainCss, ':root')
    const tokens = dark ? new Map([...root, ...blockTokens(mainCss, '.dark')]) : root
    const surface = parseColor(tokens.get('--worktree-sidebar') ?? '', tokens)
    const muted = parseColor(tokens.get('--muted-foreground') ?? '', tokens)
    const foreground = parseColor(tokens.get('--worktree-sidebar-foreground') ?? '', tokens)
    const working = [...HOST_COLORS, parseColor('var(--agent-working)', tokens)]
    const liftedMuted = mix(foreground, surface, selectedMutedLift())
    const question = [parseColor('var(--agent-question)', tokens)]
    const levels: [string, readonly Rgb[], string][] = [
      ['subtle', HOST_COLORS, "[data-host-tint='subtle']"],
      ['strong', HOST_COLORS, "[data-host-tint='strong']"],
      ['working', working, "[data-worktree-item-row]:has([data-session-highlight='working'])"],
      ['needs-you', question, "[data-worktree-item-row]:has([data-session-highlight='needs-you'])"]
    ]
    const theme = dark ? 'dark' : 'light'
    it(`${theme} section header`, () => {
      const selector = '[data-host-header-color][data-host-header-tinted]'
      const ratios = HOST_COLORS.map((color) =>
        contrast(muted, mix(color, surface, tintPercent(selector)))
      )
      expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
    })
    for (const [level, colors, selector] of levels) {
      it(`${theme} ${level}, plain and selected`, () => {
        const ratios = colors.flatMap((color) => {
          const tinted = mix(color, surface, tintPercent(selector))
          const selected = mix(foreground, tinted, selectedWashPercent(dark))
          return [contrast(muted, tinted), contrast(liftedMuted, selected)]
        })
        expect(Math.min(...ratios)).toBeGreaterThanOrEqual(AA_BODY_TEXT)
      })
    }
  }
})
