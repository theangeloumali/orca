import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, GitPullRequestArrow, LoaderCircle, Unlink } from 'lucide-react'
import type { GiteaConnectionStatus } from '../../../../../shared/gitea/gitea-credentials'
import { UnsealedCredentialNotice } from '../../provider-accounts/UnsealedCredentialNotice'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import { readIpcErrorMessage } from '@/runtime/errors/ipc-error'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { useTranslate } from '@/i18n/use-translate'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '../presentation/integration-card-shell'
import { useIntegrationSubordinateRowClass } from '../presentation/integration-card-presentation'
import type { GiteaStatus } from './integrations-pane-status'
import { usePreflightCardStatuses } from './source-control-preflight-card-status'
import { tokenProviderStatusLabel } from './token-source-control-status'
import { GiteaCredentialsDialog } from './gitea-credentials-dialog'
import { giteaConnectedSummary } from './gitea-card-summary'

const TOKEN_DOCS_URL = 'https://docs.gitea.com/next/development/api-usage'

export function GiteaIntegrationCard(): React.JSX.Element {
  const t = useTranslate()
  const { statuses, unavailable, refresh } = usePreflightCardStatuses('gitea')
  const status = unavailable ? 'unavailable' : statuses.giteaStatus
  const configured = status === 'configured'
  const mountedRef = useMountedRef()
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const [connection, setConnection] = useState<GiteaConnectionStatus | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [connectionLoadFailed, setConnectionLoadFailed] = useState(false)
  const connectionLoadGenerationRef = useRef(0)

  // Read metadata only; mounting must not decrypt secrets or trigger keychain prompts.
  const loadConnection = useCallback(async () => {
    const generation = ++connectionLoadGenerationRef.current
    const isCurrent = (): boolean =>
      mountedRef.current && generation === connectionLoadGenerationRef.current
    try {
      const next = await window.api.gitea.status()
      if (isCurrent()) {
        setConnection(next)
        setConnectionLoadFailed(false)
      }
    } catch {
      if (isCurrent()) {
        setConnectionLoadFailed(true)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  const currentConnection = connectionLoadFailed ? null : connection
  const credentialStatusKnown = currentConnection !== null
  const envManaged = currentConnection?.source === 'environment'
  const storedCredential = currentConnection?.source === 'stored'
  const summary = giteaConnectedSummary(
    currentConnection?.account ?? statuses.giteaAccount,
    currentConnection?.baseUrl ?? statuses.giteaBaseUrl
  )

  const reloadCardState = (): void => {
    void loadConnection()
    refresh()
  }

  const handleDisconnect = (): void => {
    setDisconnecting(true)
    setDisconnectError(null)
    void window.api.gitea
      .disconnect()
      .catch((error: unknown) => {
        // Surface deletion failures; otherwise disconnect silently repaints as still connected.
        if (mountedRef.current) {
          setDisconnectError(
            readIpcErrorMessage(error) ??
              t(
                'auto.components.settings.gitea.integration.card.disconnectFailed',
                'Could not remove the saved Gitea token.'
              )
          )
        }
      })
      .then(() => {
        if (mountedRef.current) {
          setDisconnecting(false)
        }
        reloadCardState()
      })
  }

  return (
    <IntegrationCardShell
      icon={<GitPullRequestArrow className="size-5" />}
      name="Gitea / Forgejo"
      description={
        configured
          ? summary
            ? t(
                'auto.components.settings.token.source.control.integration.cards.0b5242f8a2',
                '{{value0}} · Pull requests and commit statuses',
                { value0: summary }
              )
            : t(
                'auto.components.settings.token.source.control.integration.cards.52f75876be',
                'Pull requests and commit statuses for detected repositories'
              )
          : t(
              'auto.components.settings.gitea.integration.card.description',
              'Pull requests and commit statuses for Gitea and Forgejo servers.'
            )
      }
      checking={status === 'checking'}
      statusTone={configured ? 'connected' : 'attention'}
      statusLabel={tokenProviderStatusLabel(
        { configured, hasAccount: Boolean(summary), status, optional: true },
        t
      )}
      actions={
        status !== 'checking' && !envManaged && (credentialStatusKnown || connectionLoadFailed) ? (
          <Button
            variant={storedCredential ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {storedCredential || connectionLoadFailed
              ? t('auto.components.settings.gitea.integration.card.edit', 'Edit token')
              : t('auto.components.settings.gitea.integration.card.connect', 'Connect')}
          </Button>
        ) : null
      }
    >
      {status !== 'checking' ? (
        <IntegrationCardDetails>
          <UnsealedCredentialNotice
            protection={currentConnection?.credentialProtection ?? null}
            credentialName={t(
              'auto.components.settings.gitea.integration.card.credentialName',
              'Your Gitea token'
            )}
          />
          {configured && storedCredential ? (
            <div className={subordinateRowClass}>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {summary ??
                  t(
                    'auto.components.settings.gitea.integration.card.accountUnknown',
                    'Gitea server'
                  )}
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                aria-label={t(
                  'auto.components.settings.gitea.integration.card.disconnect',
                  'Disconnect Gitea'
                )}
                className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                {disconnecting ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Unlink className="size-3.5" />
                )}
              </button>
            </div>
          ) : null}
          {disconnectError ? <p className="text-xs text-destructive">{disconnectError}</p> : null}
          {connectionLoadFailed ? (
            <p role="alert" className="text-xs text-destructive">
              {t(
                'auto.components.settings.gitea.integration.card.statusLoadFailed',
                'Could not check for a saved Gitea token.'
              )}
            </p>
          ) : null}
          {credentialStatusKnown ? (
            <GiteaCardNote
              envManaged={envManaged}
              status={status}
              storedCredential={storedCredential}
            />
          ) : null}
          <div className="flex items-center gap-2">
            {!configured ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => openAppHttpLink(TOKEN_DOCS_URL, { event })}
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                {t(
                  'auto.components.settings.token.source.control.integration.cards.1a9475dace',
                  'Learn more'
                )}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={reloadCardState}>
              {t(
                'auto.components.settings.token.source.control.integration.cards.793a06e899',
                'Re-check'
              )}
            </Button>
          </div>
        </IntegrationCardDetails>
      ) : null}

      <GiteaCredentialsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialBaseUrl={currentConnection?.baseUrl}
        environmentManaged={envManaged}
        onConnected={reloadCardState}
      />
    </IntegrationCardShell>
  )
}

function GiteaCardNote(props: {
  envManaged: boolean
  status: GiteaStatus | 'unavailable'
  storedCredential: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  if (props.status === 'unavailable') {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          'auto.components.settings.token.source.control.integration.cards.0613928cb3',
          'Gitea status is not available in this runtime yet.'
        )}
      </p>
    )
  }
  if (props.status === 'not-authenticated') {
    return (
      <p className="text-xs text-muted-foreground">
        {props.storedCredential
          ? t(
              'auto.components.settings.gitea.integration.card.storedAuthFailed',
              'The saved token could not authenticate. Edit it, or check that it can still read repositories.'
            )
          : t(
              'auto.components.settings.token.source.control.integration.cards.19fb419c12',
              'Gitea credentials are configured but could not authenticate. Check the token, API base URL, and repository permissions, then restart Orca if environment variables changed.'
            )}
      </p>
    )
  }
  if (props.envManaged) {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          'auto.components.settings.gitea.integration.card.envManaged',
          'Configured via environment variables. Unset the ORCA_GITEA_* variables to manage this token in Orca.'
        )}
      </p>
    )
  }
  if (props.storedCredential) {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          'auto.components.settings.gitea.integration.card.storedCredential',
          'Saved in Orca on this machine. ORCA_GITEA_* environment variables take precedence when set.'
        )}
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground">
      {t(
        'auto.components.settings.gitea.integration.card.notConfigured',
        'Public repositories work without a token. Connect your server with an access token for private repositories and creating pull requests.'
      )}
    </p>
  )
}
