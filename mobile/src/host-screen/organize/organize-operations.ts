import * as z from 'zod'
import { salvagedOptional } from '../../../../src/shared/validation/zod-salvage'
import { bindDeferredRpcOperation, defineRpcOperation } from '../../transport/rpc/rpc-operation'
import { rpcResultVariant } from '../../transport/rpc/rpc-operation-result-reader'
import { hostScreenUnreadReplySchema } from '../host-screen-reply-schema'

export type OrganizeDismissals = { idle: string | null; clients: string | null }

// A desktop from before the fork's hints has neither key; both read as never dismissed.
const dismissalsSchema = z
  .looseObject({
    ui: z.looseObject({
      dismissedIdleProjectsKey: salvagedOptional('dismissedIdleProjectsKey', z.string().nullable()),
      dismissedClientSuggestionsKey: salvagedOptional(
        'dismissedClientSuggestionsKey',
        z.string().nullable()
      )
    })
  })
  .transform(({ ui }): OrganizeDismissals => ({
    idle: ui.dismissedIdleProjectsKey ?? null,
    clients: ui.dismissedClientSuggestionsKey ?? null
  }))

export const organizeDismissalsRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'ui.organize-dismissals-or-skip',
    method: 'ui.get',
    acceptance: 'success-result-or-skip',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('organize-dismissals', dismissalsSchema)
  })
)

// The desktop unions dismissal keys on write, so the phone never clears the desktop's own.
export const organizeDismissalWrite = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'ui.set-organize-dismissal-or-skip',
    method: 'ui.set',
    acceptance: 'success-result-or-skip',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('organize-dismissal-written', hostScreenUnreadReplySchema)
  })
)

export const projectArchiveWrite = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'repo.set-hidden',
    method: 'repo.setHidden',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('project-archived', z.unknown())
  })
)

export const projectGroupCreateWrite = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'projectGroup.create-for-client',
    method: 'projectGroup.create',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant(
      'project-group-created',
      z.looseObject({ group: z.looseObject({ id: z.string() }) }).transform(({ group }) => group.id)
    )
  })
)

export const projectGroupMoveWrite = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'projectGroup.move-for-client',
    method: 'projectGroup.moveProject',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('project-moved', z.unknown())
  })
)
