import { translate } from '@/i18n/i18n'
import {
  GITEA_CONNECT_FAILURE_COPY as EN,
  type GiteaConnectFailureCode
} from '../../../../../shared/gitea/gitea-credentials'

const COPY: Record<GiteaConnectFailureCode, () => string> = {
  invalidInput: () => translate('codeHost.giteaConnect.invalidInput', EN.invalidInput),
  invalidBaseUrl: () => translate('codeHost.giteaConnect.invalidBaseUrl', EN.invalidBaseUrl),
  tokenRequired: () => translate('codeHost.giteaConnect.tokenRequired', EN.tokenRequired),
  rejected: () => translate('codeHost.giteaConnect.rejected', EN.rejected),
  unreachable: () => translate('codeHost.giteaConnect.unreachable', EN.unreachable),
  notGiteaServer: () => translate('codeHost.giteaConnect.notGiteaServer', EN.notGiteaServer)
}

export type GiteaConnectErrorField = 'serverUrl' | 'token'

const ERROR_FIELD: Partial<Record<GiteaConnectFailureCode, GiteaConnectErrorField>> = {
  invalidBaseUrl: 'serverUrl',
  notGiteaServer: 'serverUrl',
  unreachable: 'serverUrl',
  tokenRequired: 'token',
  rejected: 'token'
}

function isGiteaConnectFailureCode(code: unknown): code is GiteaConnectFailureCode {
  return typeof code === 'string' && Object.hasOwn(COPY, code)
}

/** The dialog field a failure is about, so only that input is marked invalid. */
export function giteaConnectErrorField(failure: {
  errorCode?: unknown
}): GiteaConnectErrorField | null {
  return isGiteaConnectFailureCode(failure.errorCode)
    ? (ERROR_FIELD[failure.errorCode] ?? null)
    : null
}

/** A connect failure in the UI language; unknown codes show the host's English `error`. */
export function giteaConnectErrorText(failure: { error: string; errorCode?: unknown }): string {
  return isGiteaConnectFailureCode(failure.errorCode) ? COPY[failure.errorCode]() : failure.error
}
