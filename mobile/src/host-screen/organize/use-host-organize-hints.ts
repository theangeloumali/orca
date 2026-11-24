import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNow } from '../../hooks/use-now'
import type { ProjectGroup } from '../../../../src/shared/project/groups/project-group-types'
import type { ConnectionState } from '../../transport/connection/connection-state'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { SectionRepo, Worktree } from '../../worktree/workspace-list/workspace-list-types'
import { archiveProjects, fileClientSuggestions } from './organize-actions'
import {
  organizeDismissalsRead,
  organizeDismissalWrite,
  projectArchiveWrite,
  projectGroupCreateWrite,
  projectGroupMoveWrite,
  type OrganizeDismissals
} from './organize-operations'
import { buildClientHint, buildIdleHint, isDirectlyFileableHost } from './phone-organize-hints'

// A refused or failed write counts as not done; the hint stays so the user can retry.
async function attempt<Value>(
  send: () => Promise<Value>
): Promise<{ ok: true; value: Value } | { ok: false }> {
  try {
    return { ok: true, value: await send() }
  } catch {
    return { ok: false }
  }
}

/** The fork desktop's Archive and client-grouping offers, for the projects the phone can see. */
export function useHostOrganizeHints(args: {
  client: RpcClient | null
  connState: ConnectionState
  repos: readonly SectionRepo[]
  projectGroups: readonly ProjectGroup[]
  rows: readonly Worktree[]
  onChanged: () => void
}) {
  const { client, connState, repos, projectGroups, rows, onChanged } = args
  const [dismissed, setDismissed] = useState<OrganizeDismissals | null>(null)
  const [busy, setBusy] = useState(false)
  // Hints acted on hide at once; the repo list catches up on its next read.
  const [acted, setActed] = useState<ReadonlySet<string>>(() => new Set())
  // Idle ages count in days, so an hourly clock keeps the offer current.
  const now = useNow(60 * 60 * 1000, true)
  useEffect(() => {
    if (!client || connState !== 'connected') {
      return
    }
    let live = true
    void attempt(async () =>
      organizeDismissalsRead.interpret(await organizeDismissalsRead.request(client))
    ).then((read) => {
      if (live && read.ok && read.value.accepted) {
        setDismissed(read.value.value)
      }
    })
    return () => {
      live = false
    }
  }, [client, connState])
  const idle = useMemo(() => {
    const hint = dismissed ? buildIdleHint(repos, rows, now, dismissed.idle) : null
    return hint && !acted.has(hint.key) ? hint : null
  }, [dismissed, repos, rows, now, acted])
  const clients = useMemo(() => {
    const hint = dismissed
      ? buildClientHint(repos, projectGroups, dismissed.clients, isDirectlyFileableHost)
      : null
    return hint && !acted.has(hint.key) ? hint : null
  }, [dismissed, repos, projectGroups, acted])
  const run = useCallback(
    async (work: (rpc: RpcClient) => Promise<unknown>) => {
      if (!client || busy) {
        return
      }
      setBusy(true)
      try {
        await work(client)
      } finally {
        setBusy(false)
        onChanged()
      }
    },
    [client, busy, onChanged]
  )
  const dismiss = useCallback(
    (kind: keyof OrganizeDismissals, key: string) =>
      run(async (rpc) => {
        const field = kind === 'idle' ? 'dismissedIdleProjectsKey' : 'dismissedClientSuggestionsKey'
        const written = await attempt(async () =>
          organizeDismissalWrite.interpret(
            await organizeDismissalWrite.request(rpc, { [field]: key })
          )
        )
        if (written.ok && written.value.accepted) {
          setDismissed((current) => (current ? { ...current, [kind]: key } : current))
        }
      }),
    [run]
  )
  const archiveIdle = useCallback(async () => {
    if (!idle) {
      return
    }
    setActed((current) => new Set(current).add(idle.key))
    await run((rpc) =>
      archiveProjects(idle.repos, async (params) => {
        const archived = await attempt(async () =>
          projectArchiveWrite.interpret(await projectArchiveWrite.request(rpc, params))
        )
        return archived.ok
      })
    )
  }, [idle, run])
  const groupClients = useCallback(async () => {
    if (!clients) {
      return
    }
    setActed((current) => new Set(current).add(clients.key))
    await run((rpc) =>
      fileClientSuggestions(clients.suggestions, {
        createGroup: async (params) => {
          const created = await attempt(async () =>
            projectGroupCreateWrite.interpret(await projectGroupCreateWrite.request(rpc, params))
          )
          return created.ok ? created.value : null
        },
        moveProject: async (params) => {
          const moved = await attempt(async () =>
            projectGroupMoveWrite.interpret(await projectGroupMoveWrite.request(rpc, params))
          )
          return moved.ok
        }
      })
    )
  }, [clients, run])
  return { idle, clients, busy, dismiss, archiveIdle, groupClients }
}
