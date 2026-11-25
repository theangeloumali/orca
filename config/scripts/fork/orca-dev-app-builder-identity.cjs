// Orca Dev installs beside prod Orca, so every field macOS keys an app on must differ from prod's.
const PROD_IDENTITY = {
  appId: 'com.stablyai.orca',
  productName: 'Orca',
  urlScheme: 'orca',
  macIcon: 'resources/build/icon.icns'
}
const ORCA_DEV_IDENTITY = {
  appId: 'com.theangeloumali.orca.dev',
  productName: 'Orca Dev',
  urlScheme: 'orca-dev',
  macIcon: 'resources/build/icon-dev.icns'
}
const RELEASE_CHANNEL_ENV_KEYS = [
  'ORCA_MAC_RELEASE',
  'ORCA_MAC_HOURLY',
  'ORCA_MAC_DAILY',
  'ORCA_MAC_ADHOC'
]

function resolveBuilderAppIdentity(env = process.env) {
  if (env.ORCA_FORK_DEV_APP !== '1') {
    return PROD_IDENTITY
  }
  const releaseKey = RELEASE_CHANNEL_ENV_KEYS.find((key) => env[key] === '1')
  if (releaseKey) {
    throw new Error(`Orca Dev is a local build; unset ${releaseKey} (a release channel).`)
  }
  return ORCA_DEV_IDENTITY
}

module.exports = { resolveBuilderAppIdentity }
