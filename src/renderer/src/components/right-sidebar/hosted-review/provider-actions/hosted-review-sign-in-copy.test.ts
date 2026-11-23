import { describe, expect, it } from 'vitest'
import { localizedHostedReviewCopy } from '@/i18n/hosted-review-localized-copy'
import { authRequiredDetail, hostedReviewSignInHint } from './hosted-review-sign-in-copy'

describe('Gitea sign-in copy', () => {
  it('points at the Settings connect flow before the env var', () => {
    expect(authRequiredDetail('gitea', localizedHostedReviewCopy('gitea'))).toBe(
      'Gitea is not authenticated. Next step: connect Gitea / Forgejo in Settings > Integrations, or set ORCA_GITEA_API_BASE_URL and ORCA_GITEA_TOKEN in this environment.'
    )
    expect(hostedReviewSignInHint('gitea')).toBe(
      'Connect Gitea / Forgejo in Settings > Integrations'
    )
  })

  it('keeps the variable step for Azure DevOps', () => {
    expect(hostedReviewSignInHint('azure-devops')).toBe(
      'Set ORCA_AZURE_DEVOPS_TOKEN in this environment'
    )
  })
})
