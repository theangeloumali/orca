import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyForkAppIdentity } from './fork-app-identity.cjs'

const officialConfig = {
  name: 'Orca',
  scheme: 'orca',
  ios: { bundleIdentifier: 'com.stably.orca.mobile', buildNumber: '1' },
  android: {
    package: 'dev.orca.app',
    versionCode: 32,
    googleServicesFile: './google-services.json'
  },
  extra: { keep: true }
}

describe('applyForkAppIdentity', () => {
  it('gives the fork its own name, scheme, bundle id and package by default', () => {
    const config = applyForkAppIdentity(officialConfig, {})
    expect(config.name).toBe('Orca ZK')
    expect(config.scheme).toBe('orcazk')
    expect(config.ios.bundleIdentifier).toBe('com.zkidzdev.orca.mobile')
    expect(config.android.package).toBe('com.zkidzdev.orca')
  })

  it("drops Stably's Firebase file unless the fork supplies its own", () => {
    expect(applyForkAppIdentity(officialConfig, {}).android).not.toHaveProperty(
      'googleServicesFile'
    )
    const withOwn = applyForkAppIdentity(officialConfig, {
      ORCA_ANDROID_GOOGLE_SERVICES_FILE: './fork-google-services.json'
    })
    expect(withOwn.android.googleServicesFile).toBe('./fork-google-services.json')
  })

  it('takes every identity value from the environment when set', () => {
    const config = applyForkAppIdentity(officialConfig, {
      ORCA_MOBILE_APP_NAME: 'Orca Lab',
      ORCA_MOBILE_SCHEME: 'orcalab',
      ORCA_IOS_BUNDLE_ID: 'com.example.orca',
      ORCA_ANDROID_PACKAGE: 'com.example.orca.android'
    })
    expect([
      config.name,
      config.scheme,
      config.ios.bundleIdentifier,
      config.android.package
    ]).toEqual(['Orca Lab', 'orcalab', 'com.example.orca', 'com.example.orca.android'])
  })

  it('keeps the rest of the config and marks the build as a fork build', () => {
    const config = applyForkAppIdentity(officialConfig, {})
    expect(config.ios.buildNumber).toBe('1')
    expect(config.android.versionCode).toBe(32)
    expect(config.extra).toEqual({ keep: true, orcaForkBuild: true, orcaForkPush: false })
  })

  it('leaves the official identity untouched when asked for it', () => {
    const config = applyForkAppIdentity(officialConfig, { ORCA_MOBILE_OFFICIAL_IDENTITY: '1' })
    expect(config).toEqual(officialConfig)
  })
})

describe('fork push flag', () => {
  it('marks push available only when the fork brings its own push setup', () => {
    expect(applyForkAppIdentity(officialConfig, {}).extra.orcaForkPush).toBe(false)
    expect(applyForkAppIdentity(officialConfig, { ORCA_FORK_PUSH: '1' }).extra.orcaForkPush).toBe(
      true
    )
  })
})

describe('release lanes', () => {
  it("default to the fork identity's native project, bundle id and package", () => {
    const fastfile = readFileSync(new URL('../fastlane/Fastfile', import.meta.url), 'utf8')
    const fork = applyForkAppIdentity(officialConfig, {})
    // Prebuild names the native project after the app name without spaces.
    expect(fastfile).toContain(`ENV.fetch("IOS_PROJECT_NAME", "${fork.name.replace(/\s+/g, '')}")`)
    expect(fastfile).toContain(`ENV.fetch("IOS_BUNDLE_IDENTIFIER", "${fork.ios.bundleIdentifier}")`)
    expect(fastfile).toContain(`ENV.fetch("ORCA_ANDROID_PACKAGE", "${fork.android.package}")`)
  })
})
