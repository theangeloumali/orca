import { describe, expect, it } from 'vitest'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import { mergeSettings, withBrowserHostOverrides } from './web-preference-normalization'

// The same merge settleRuntimeSettings applies to every runtime reply.
const mergeRuntimeSettings = (runtime: Partial<GlobalSettings>): GlobalSettings =>
  mergeSettings(local, withBrowserHostOverrides(local, runtime))

const local: GlobalSettings = {
  ...getDefaultSettings('~'),
  hostSettingOverrides: {
    'ssh:box': { displayLabel: 'Old name', color: '#ef4444', sectionTint: 'strong' },
    local: { color: 'none' }
  }
}

describe('paired web settings merge', () => {
  it('takes device names from the host but keeps this browser’s colors and backgrounds', () => {
    const merged = mergeRuntimeSettings({
      hostSettingOverrides: { 'ssh:box': { displayLabel: 'Box' } }
    })
    expect(merged.hostSettingOverrides).toEqual({
      'ssh:box': { displayLabel: 'Box', color: '#ef4444', sectionTint: 'strong' },
      local: { color: 'none' }
    })
  })

  it('drops a name the host cleared without dropping the color', () => {
    const merged = mergeRuntimeSettings({ hostSettingOverrides: {} })
    expect(merged.hostSettingOverrides).toEqual({
      'ssh:box': { color: '#ef4444', sectionTint: 'strong' },
      local: { color: 'none' }
    })
  })

  it('keeps this browser’s group backgrounds when the host sends its own', () => {
    const browser: GlobalSettings = { ...local, projectGroupTints: { clients: 'strong' } }
    const merged = mergeSettings(
      browser,
      withBrowserHostOverrides(browser, { projectGroupTints: { clients: 'off', oss: 'subtle' } })
    )
    expect(merged.projectGroupTints).toEqual({ clients: 'strong' })
  })

  it('leaves local overrides alone when the host sends none', () => {
    expect(mergeRuntimeSettings({}).hostSettingOverrides).toEqual(local.hostSettingOverrides)
  })
})
