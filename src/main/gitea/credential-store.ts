import { inCredentialFileOrder, credentialFileExists } from '../credentials/credential-file-io'
import { mkdir, readFile, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken,
  writeCredentialFileAtomic,
  writeEncryptedCredential
} from '../credentials/integration-credential-file'
import { readCredentialFileProtection } from '../credentials/credential-file-protection'
import type { SecretAtRestProtection } from '../../shared/secure-storage/secret-at-rest-protection'

// Plaintext display metadata lets status reads avoid keychain prompts.
export type GiteaStoredMetadata = {
  version: 1
  baseUrl: string
  account: string | null
  updatedAt: string
}

// The envelope carries baseUrl so a torn save cannot pair this token with another host.
export type GiteaStoredSecret = {
  token: string
  baseUrl: string
}

export type GiteaCredentialSaveInput = GiteaStoredSecret & { account: string | null }

let cachedMetadata: GiteaStoredMetadata | null = null
let metadataLoadedFromDisk = false
let cachedSecret: GiteaStoredSecret | null = null
let credentialError: string | null = null
// Stays false after a restart until a request with the stored token succeeds.
let storedCredentialChecked = false

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getMetadataPath(): string {
  return join(getOrcaDir(), 'gitea-credential.json')
}

function getSecretPath(): string {
  return join(getOrcaDir(), 'gitea-credential.enc')
}

function inStoreOrder<T>(run: () => Promise<T>): Promise<T> {
  return inCredentialFileOrder(`${getSecretPath()}.mutation`, run)
}

const requiredText = z.string().min(1)
// A wrong-typed display field reads as absent instead of discarding the whole file.
const optionalText = requiredText.nullish().catch(null)
const storedMetadataSchema = z.object({
  baseUrl: requiredText,
  account: optionalText,
  updatedAt: optionalText
})
const storedSecretSchema = z.object({ token: requiredText, baseUrl: requiredText })

async function readMetadataFromDisk(): Promise<GiteaStoredMetadata | null> {
  const path = getMetadataPath()
  if (!(await credentialFileExists(path))) {
    return null
  }
  try {
    const parsed = storedMetadataSchema.safeParse(JSON.parse(await readFile(path, 'utf-8')))
    if (!parsed.success) {
      return null
    }
    return {
      version: 1,
      baseUrl: parsed.data.baseUrl,
      account: parsed.data.account ?? null,
      updatedAt: parsed.data.updatedAt ?? ''
    }
  } catch {
    return null
  }
}

async function loadMetadata(): Promise<GiteaStoredMetadata | null> {
  if (!metadataLoadedFromDisk) {
    cachedMetadata = await readMetadataFromDisk()
    metadataLoadedFromDisk = true
  }
  return cachedMetadata
}

export function getStoredGiteaMetadata(): Promise<GiteaStoredMetadata | null> {
  return inStoreOrder(loadMetadata)
}

// Presence checks must avoid keychain prompts.
export async function hasStoredGiteaCredential(): Promise<boolean> {
  return (
    (await getStoredGiteaMetadata()) !== null && (await credentialFileHasContent(getSecretPath()))
  )
}

// Without force, read memory only; forced decryption can throw CredentialDecryptionError.
export function loadStoredGiteaSecret(
  options: { force?: boolean } = {}
): Promise<GiteaStoredSecret | null> {
  return inStoreOrder(async () => {
    if (cachedSecret !== null || !options.force) {
      return cachedSecret
    }
    const path = getSecretPath()
    if (!(await credentialFileExists(path))) {
      return null
    }
    try {
      const envelope = readStoredCredentialToken('Gitea', await readFile(path))
      const parsed = storedSecretSchema.safeParse(envelope ? JSON.parse(envelope) : null)
      cachedSecret = parsed.success ? parsed.data : null
      credentialError = null
      return cachedSecret
    } catch (error) {
      if (error instanceof CredentialDecryptionError) {
        credentialError = error.message
        throw error
      }
      return null
    }
  })
}

export function getStoredGiteaCredentialError(): string | null {
  return credentialError
}

export function isStoredGiteaCredentialChecked(): boolean {
  return storedCredentialChecked
}

// Only the token currently stored counts; an env token or a replaced one does not.
export function noteGiteaTokenWorked(token: string): void {
  if (cachedSecret?.token === token) {
    storedCredentialChecked = true
  }
}

export function getGiteaCredentialProtection(): Promise<SecretAtRestProtection | null> {
  return readCredentialFileProtection(getSecretPath())
}

export function saveGiteaCredential(input: GiteaCredentialSaveInput): Promise<void> {
  return inStoreOrder(async () => {
    const dir = getOrcaDir()
    if (!(await credentialFileExists(dir))) {
      await mkdir(dir, { recursive: true })
    }
    const secret: GiteaStoredSecret = { token: input.token, baseUrl: input.baseUrl }
    await writeEncryptedCredential('Gitea', getSecretPath(), JSON.stringify(secret))
    const metadata: GiteaStoredMetadata = {
      version: 1,
      baseUrl: input.baseUrl,
      account: input.account,
      updatedAt: new Date().toISOString()
    }
    await writeCredentialFileAtomic(
      getMetadataPath(),
      Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8')
    )
    cachedMetadata = metadata
    metadataLoadedFromDisk = true
    cachedSecret = secret
    credentialError = null
    storedCredentialChecked = true
  })
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

// Surface failed deletes so credentials cannot silently reappear on relaunch.
export function clearStoredGiteaCredential(): Promise<void> {
  return inStoreOrder(async () => {
    cachedSecret = null
    cachedMetadata = null
    storedCredentialChecked = false
    try {
      for (const path of [getSecretPath(), getMetadataPath()]) {
        await unlink(path).catch((error: unknown) => {
          if (!isMissingFileError(error)) {
            throw error
          }
        })
      }
    } catch (error) {
      // A partial delete may leave files behind, so the next status read goes back to disk.
      metadataLoadedFromDisk = false
      throw error
    }
    metadataLoadedFromDisk = true
    credentialError = null
  })
}

/** @internal - tests need a clean in-memory cache between cases. */
export function _resetGiteaCredentialCache(): void {
  cachedMetadata = null
  metadataLoadedFromDisk = false
  cachedSecret = null
  credentialError = null
  storedCredentialChecked = false
}
