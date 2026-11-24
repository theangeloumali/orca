import { describe, expect, it } from 'vitest'
import { hostTintPercents } from '../../../../../../shared/execution-host/host-tint-contrast'
import { buildHostRowAppearance, getHostHeaderPaint, hostColorStyle } from './host-row-appearance'

const header = (hostId: 'local' | 'ssh:m1') => ({ type: 'host-header' as const, hostId })
const item = { type: 'item' as const }
const order = ['local', 'ssh:m1']

describe('host row appearance', () => {
  it('gives each row the color and tint of the host section above it', () => {
    const settings = {
      hostSettingOverrides: { 'ssh:m1': { color: '#ef4444', sectionTint: 'strong' as const } }
    }
    const rows = [header('local'), item, header('ssh:m1'), item, item]
    const byRow = buildHostRowAppearance(rows, settings, order)
    expect(byRow[1]).toEqual(byRow[0])
    expect(byRow[3]).toEqual({ hostId: 'ssh:m1', color: '#ef4444', tint: 'strong' })
    expect(byRow[4]).toBe(byRow[3])
  })

  it('leaves rows uncolored when no host header precedes them or the host chose None', () => {
    const settings = { hostSettingOverrides: { local: { color: 'none' } } }
    expect(buildHostRowAppearance([item, header('local'), item], settings, order)).toEqual([
      null,
      null,
      null
    ])
  })

  it('keeps the host color off blocked, disconnected and suspended headers', () => {
    const appearance = { hostId: 'ssh:m1' as const, color: '#ef4444', tint: 'subtle' as const }
    expect(getHostHeaderPaint(appearance, 'available')).toEqual({ colored: true, tinted: true })
    for (const health of ['blocked', 'disconnected', 'suspended'] as const) {
      expect(getHostHeaderPaint(appearance, health)).toEqual({ colored: false, tinted: false })
    }
    expect(getHostHeaderPaint({ ...appearance, tint: 'off' }, 'available')).toEqual({
      colored: true,
      tinted: false
    })
    expect(getHostHeaderPaint(null, 'available')).toEqual({ colored: false, tinted: false })
  })

  it('sets each tint share beside the color so CSS reads the AA-safe value', () => {
    const style = hostColorStyle({ hostId: 'ssh:m1', color: '#000000', tint: 'strong' })
    expect(style?.['--host-color']).toBe('#000000')
    expect(style?.['--host-tint-strong']).toBe(`${hostTintPercents('#000000').strong}%`)
    expect(hostColorStyle(null)).toBeUndefined()
  })
})
