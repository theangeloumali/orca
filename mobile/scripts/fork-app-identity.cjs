// The fork (theangeloumali/orca) ships its own app beside the official one: own name, scheme,
// bundle id and package, and no Stably Firebase file. ORCA_MOBILE_OFFICIAL_IDENTITY=1 keeps upstream's.
// ORCA_FORK_PUSH=1 marks a build that ships its own APNs key and Firebase project.
const FORK_DEFAULTS = {
  name: 'Orca ZK',
  scheme: 'orcazk',
  iosBundleIdentifier: 'com.zkidzdev.orca.mobile',
  androidPackage: 'com.zkidzdev.orca'
}

function applyForkAppIdentity(config, env) {
  if (env.ORCA_MOBILE_OFFICIAL_IDENTITY === '1') {
    return config
  }
  const { googleServicesFile: _official, ...android } = config.android ?? {}
  const forkGoogleServices = env.ORCA_ANDROID_GOOGLE_SERVICES_FILE
  return {
    ...config,
    name: env.ORCA_MOBILE_APP_NAME || FORK_DEFAULTS.name,
    scheme: env.ORCA_MOBILE_SCHEME || FORK_DEFAULTS.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: env.ORCA_IOS_BUNDLE_ID || FORK_DEFAULTS.iosBundleIdentifier
    },
    android: {
      ...android,
      package: env.ORCA_ANDROID_PACKAGE || FORK_DEFAULTS.androidPackage,
      ...(forkGoogleServices ? { googleServicesFile: forkGoogleServices } : {})
    },
    extra: { ...config.extra, orcaForkBuild: true, orcaForkPush: env.ORCA_FORK_PUSH === '1' }
  }
}

function isForkBuildConfig(config) {
  return config?.extra?.orcaForkBuild === true
}

module.exports = { applyForkAppIdentity, isForkBuildConfig }
