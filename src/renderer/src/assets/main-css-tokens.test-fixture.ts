import { readFileSync } from 'node:fs'
import { hexToRgb, type Rgba } from '../../../shared/color/rgba-contrast'

export type Tokens = ReadonlyMap<string, string>

const readCss = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8')
export const mainCss = readCss('./main.css')
const tailwindTheme = readCss('../../../../node_modules/tailwindcss/theme.css')

function blockTokens(css: string, opener: string): Tokens {
  const start = css.indexOf(`\n${opener} {`)
  const body = css.slice(start, css.indexOf('}', start))
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value])
  )
}

/** main.css tokens for a built-in theme; .dark only overrides, the rest cascades from :root. */
export function builtInThemeTokens(dark: boolean): Tokens {
  const root = blockTokens(mainCss, ':root')
  return dark ? new Map([...root, ...blockTokens(mainCss, '.dark')]) : root
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

/** Resolves hex, oklch and var() chains the built-in themes use. */
export function parseColor(value: string, tokens: Tokens): Rgba {
  const reference = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (reference) {
    return parseColor(tokens.get(reference[1]) ?? themeTokens.get(reference[1]) ?? '', tokens)
  }
  const oklch = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/.exec(value.trim())
  if (oklch) {
    return oklchToRgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]))
  }
  const hex = value.trim().replace(/^#([\da-f])([\da-f])([\da-f])$/i, '#$1$1$2$2$3$3')
  if (!/^#[\da-f]{6}$/i.test(hex)) {
    throw new Error(`unparsed color: ${value}`)
  }
  return hexToRgb(hex)
}

/** The body of the rule whose selector is exactly `selector`, comments stripped. */
export function cssRuleBody(css: string, selector: string): string {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, ruleSelector, body] of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (ruleSelector.trim() === selector) {
      return body
    }
  }
  throw new Error(`no rule for ${selector}`)
}
