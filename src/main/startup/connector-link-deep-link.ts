// orca://<linear|github>/link?t=<result>: a connect trip's "Open Orca", read in main. Kept out of
// src/shared because it checks the result against the cloud contract, which the CLI build cannot reach.
import { CONNECTOR_CONNECT_CODE_PATTERN } from '../../../cloud/packages/connector-contract/src/connect-messages'
import type { ConnectorLinkDeepLink, ConnectorLinkSource } from '../../shared/bot-deep-link'
import { CONNECTOR_CONNECT_SOURCES } from '../../shared/connectors/connector-cloud-contract'
import { IS_ORCA_DEV_APP } from '../../shared/fork/orca-dev-app-flag'

// Orca Dev.app registers only orca-dev://, so its links never open prod Orca.
const CONNECTOR_LINK_SCHEME = IS_ORCA_DEV_APP ? 'orca-dev' : 'orca'

function isConnectorLinkSource(value: string): value is ConnectorLinkSource {
  return CONNECTOR_CONNECT_SOURCES.some((source) => source === value)
}

export function parseConnectorLinkDeepLink(value: string): ConnectorLinkDeepLink | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  const source = url.host
  if (
    url.protocol !== `${CONNECTOR_LINK_SCHEME}:` ||
    !isConnectorLinkSource(source) ||
    !/^\/link\/?$/.test(url.pathname)
  ) {
    return null
  }
  const token = url.searchParams.get('t')
  return token !== null && CONNECTOR_CONNECT_CODE_PATTERN.test(token) ? { source, token } : null
}

export function formatConnectorLinkDeepLink({ source, token }: ConnectorLinkDeepLink): string {
  return `${CONNECTOR_LINK_SCHEME}://${source}/link?t=${encodeURIComponent(token)}`
}
