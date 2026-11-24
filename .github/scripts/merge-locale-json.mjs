// Resolves a conflicted locale catalog key by key against the base: a side that left a key as it was
// yields to the side that changed, added or deleted it, and the fork wins where both changed a key.
// In a translated catalog upstream owns the wording of keys both sides have; the fork's own keys stay.
// Translated catalogs are then pruned to the merged en.json, since neither side may keep retired keys.
// Runs mid-merge, reading git's index stages (1 base, 2 fork, 3 upstream).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function mergeLocaleCatalogs(ours, theirs, base = {}, options = {}) {
  const out = {}
  for (const key of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
    const merged = mergeEntry(
      ours[key],
      theirs[key],
      isObject(base) ? base[key] : undefined,
      options
    )
    if (merged !== undefined) {
      out[key] = merged
    }
  }
  return out
}

function mergeEntry(ours, theirs, base, options) {
  if (isObject(ours) && isObject(theirs)) {
    return mergeLocaleCatalogs(ours, theirs, base ?? {}, options)
  }
  if (options.upstreamOwnsShared && ours !== undefined && theirs !== undefined) {
    return theirs
  }
  if (isDeepStrictEqual(ours, base)) {
    return theirs
  }
  if (isDeepStrictEqual(theirs, base)) {
    return ours
  }
  return ours ?? theirs
}

export function pruneToReference(catalog, reference) {
  const out = {}
  for (const [key, value] of Object.entries(catalog)) {
    if (!(key in reference)) {
      continue
    }
    out[key] =
      isObject(value) && isObject(reference[key]) ? pruneToReference(value, reference[key]) : value
  }
  return out
}

function readStage(n, file) {
  try {
    return JSON.parse(
      execFileSync('git', ['show', `:${n}:${file}`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore']
      })
    )
  } catch {
    return undefined
  }
}

function mergeStages(file) {
  const upstreamOwnsShared = path.basename(file) !== 'en.json'
  return mergeLocaleCatalogs(
    readStage(2, file) ?? {},
    readStage(3, file) ?? {},
    readStage(1, file) ?? {},
    { upstreamOwnsShared }
  )
}

// en.json may itself be mid-conflict; then its merged form is the reference.
function englishReference(file) {
  const english = path.join(path.dirname(file), 'en.json')
  if (path.basename(file) === 'en.json' || !existsSync(english)) {
    return undefined
  }
  return readStage(2, english) ? mergeStages(english) : JSON.parse(readFileSync(english, 'utf8'))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file] = process.argv.slice(2)
  const merged = mergeStages(file)
  const reference = englishReference(file)
  const result = reference ? pruneToReference(merged, reference) : merged
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
}
