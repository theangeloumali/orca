import { useEffectEvent, useId, useLayoutEffect, useState } from 'react'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DialogCancel, DialogError } from '@/components/ui/dialog-parts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { preventOutsideDismissWhenDirty } from '@/lib/overlay-interaction/outside-dismiss-guard'
import { giteaConnectErrorText } from '@/lib/source-control/remote/gitea-connect-error-copy'
import { useTranslate } from '@/i18n/use-translate'

type ConnectState = 'idle' | 'connecting' | 'error'

type GiteaCredentialsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Stored API base URL, shown as the server URL when editing. */
  initialBaseUrl?: string | null
  /** Env vars win over stored credentials, so saving here would have no effect. */
  environmentManaged?: boolean
  onConnected?: () => void
}

function serverUrlFromApiBase(apiBaseUrl: string | null | undefined): string {
  return (apiBaseUrl ?? '').replace(/\/api\/v1\/?$/i, '')
}

export function GiteaCredentialsDialog({
  open,
  onOpenChange,
  initialBaseUrl,
  environmentManaged = false,
  onConnected
}: GiteaCredentialsDialogProps): React.JSX.Element {
  const t = useTranslate()
  const mountedRef = useMountedRef()
  const serverUrlId = useId()
  const tokenId = useId()
  const errorId = useId()

  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [baselineServerUrl, setBaselineServerUrl] = useState('')

  // Reseed on each opening; the token always starts empty because main never returns it.
  const seedFromStoredMetadata = useEffectEvent(() => {
    const seed = serverUrlFromApiBase(initialBaseUrl)
    setBaselineServerUrl(seed)
    setServerUrl(seed)
    setToken('')
    setConnectState('idle')
    setConnectError(null)
  })
  useLayoutEffect(() => {
    if (open) {
      seedFromStoredMetadata()
    }
  }, [open])

  const locked = environmentManaged
  const connecting = connectState === 'connecting'
  const canSubmit = !locked && !connecting && Boolean(serverUrl.trim()) && Boolean(token.trim())

  const clearErrorOnEdit = (): void => {
    if (connectState === 'error') {
      setConnectState('idle')
      setConnectError(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!connecting) {
      onOpenChange(nextOpen)
    }
  }

  const guardOutsideDismiss = preventOutsideDismissWhenDirty(
    () => serverUrl !== baselineServerUrl || token !== ''
  )

  const handleConnect = async (): Promise<void> => {
    if (!canSubmit) {
      return
    }
    setConnectState('connecting')
    setConnectError(null)
    try {
      const result = await window.api.gitea.connect({
        baseUrl: serverUrl.trim(),
        token: token.trim()
      })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setToken('')
        setConnectState('idle')
        onOpenChange(false)
        onConnected?.()
        return
      }
      setConnectState('error')
      setConnectError(giteaConnectErrorText(result))
    } catch (error) {
      if (mountedRef.current) {
        setConnectState('error')
        setConnectError(
          error instanceof Error
            ? error.message
            : t(
                'auto.components.settings.gitea.credentials.dialog.connectFailed',
                'Connection failed'
              )
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="form"
        scrollable
        busy={connecting}
        onPointerDownOutside={guardOutsideDismiss}
        onInteractOutside={guardOutsideDismiss}
        onKeyDown={(event) => {
          // Intercept Enter only in inputs; Cancel keeps its own action.
          if (!(event.target instanceof HTMLInputElement)) {
            return
          }
          if (event.key === 'Enter' && canSubmit) {
            event.preventDefault()
            void handleConnect()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {t(
              'auto.components.settings.gitea.credentials.dialog.title',
              'Connect Gitea / Forgejo'
            )}
          </DialogTitle>
          {locked ? (
            <DialogDescription>
              {t(
                'auto.components.settings.gitea.credentials.dialog.environmentManaged',
                'Set by ORCA_GITEA_* environment variables. Unset them to save a token here.'
              )}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {locked ? null : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={serverUrlId} variant="dialog-field">
                {t('auto.components.settings.gitea.credentials.dialog.serverUrl', 'Server URL')}
              </Label>
              <Input
                id={serverUrlId}
                autoFocus
                type="url"
                placeholder={t(
                  'auto.components.settings.gitea.credentials.dialog.serverUrlPlaceholder',
                  'https://git.example.com'
                )}
                value={serverUrl}
                onChange={(event) => {
                  setServerUrl(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connecting}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={tokenId} variant="dialog-field">
                {t('auto.components.settings.gitea.credentials.dialog.token', 'Access token')}
              </Label>
              <Input
                id={tokenId}
                type="password"
                autoComplete="off"
                placeholder={t(
                  'auto.components.settings.gitea.credentials.dialog.tokenPlaceholder',
                  'Gitea or Forgejo access token'
                )}
                value={token}
                onChange={(event) => {
                  setToken(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connecting}
                aria-invalid={connectState === 'error'}
                aria-describedby={connectState === 'error' ? errorId : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'auto.components.settings.gitea.credentials.dialog.tokenNeeds',
                  'Needs repository read access, plus write access to create pull requests.'
                )}
              </p>
            </div>
          </div>
        )}
        {connectState === 'error' && connectError ? (
          <DialogError id={errorId}>{connectError}</DialogError>
        ) : null}
        <DialogFooter>
          <DialogCancel>
            {locked
              ? t('auto.components.settings.gitea.credentials.dialog.close', 'Close')
              : t('auto.components.settings.gitea.credentials.dialog.cancel', 'Cancel')}
          </DialogCancel>
          {locked ? null : (
            <Button size="sm" onClick={() => void handleConnect()} disabled={!canSubmit}>
              {connecting
                ? t('auto.components.settings.gitea.credentials.dialog.verifying', 'Verifying…')
                : t('auto.components.settings.gitea.credentials.dialog.connect', 'Connect')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
