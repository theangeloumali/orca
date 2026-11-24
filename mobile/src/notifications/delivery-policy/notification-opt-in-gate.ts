import Constants from 'expo-constants'
import { readPushNotificationsPreference } from '../../storage/preferences'
import { forkBuildLacksPush } from './fork-push-availability'

export async function shouldPresentNotificationOptIn(): Promise<boolean> {
  // Offering push the app can never receive would only mislead.
  if (forkBuildLacksPush(Constants.expoConfig?.extra)) {
    return false
  }
  const preference = await readPushNotificationsPreference()
  return preference.loaded && preference.value === null
}
