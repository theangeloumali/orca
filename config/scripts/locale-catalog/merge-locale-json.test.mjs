import { strict as assert } from 'node:assert'
import { test } from 'vitest'

import {
  mergeLocaleCatalogs,
  pruneToReference
} from '../../../.github/scripts/merge-locale-json.mjs'

test('drops a key upstream deleted when the fork left it unchanged', () => {
  const base = { a: 'A', gone: 'G' }
  const ours = { a: 'A', gone: 'G' }
  const theirs = { a: 'A' }
  assert.deepEqual(mergeLocaleCatalogs(ours, theirs, base), { a: 'A' })
})

test('keeps a key upstream deleted when the fork changed it', () => {
  const base = { gone: 'G' }
  assert.deepEqual(mergeLocaleCatalogs({ gone: 'G2' }, {}, base), { gone: 'G2' })
})

test('keeps keys only one side added and lets the fork win on both-set keys', () => {
  const merged = mergeLocaleCatalogs({ x: 'ours', f: 'F' }, { x: 'theirs', u: 'U' }, {})
  assert.deepEqual(merged, { x: 'ours', u: 'U', f: 'F' })
})

test('takes the upstream value when the fork left the key as it was in the base', () => {
  const base = { s: 'Update {{count}}' }
  const ours = { s: 'Update {{count}}' }
  const theirs = { s: 'Update all {{total}}' }
  assert.deepEqual(mergeLocaleCatalogs(ours, theirs, base), { s: 'Update all {{total}}' })
})

test('drops a key the fork deleted when upstream left it unchanged', () => {
  const base = { a: 'A', retired: 'R' }
  assert.deepEqual(mergeLocaleCatalogs({ a: 'A' }, { a: 'A', retired: 'R' }, base), { a: 'A' })
})

test('prunes translated keys the English reference no longer has', () => {
  const reference = { ns: { keep: 'K' }, top: 'T' }
  const catalog = { ns: { keep: 'k', gone: 'g' }, top: 't', extra: { x: 'x' } }
  assert.deepEqual(pruneToReference(catalog, reference), { ns: { keep: 'k' }, top: 't' })
})

test('a translated catalog takes upstream wording for a key both sides have', () => {
  const base = { s: 'old', ns: { k: 'base' } }
  const ours = { s: 'fork edit', ns: { k: 'fork', mine: 'M' } }
  const theirs = { s: 'old', ns: { k: 'up' } }
  assert.deepEqual(mergeLocaleCatalogs(ours, theirs, base, { upstreamOwnsShared: true }), {
    s: 'old',
    ns: { k: 'up', mine: 'M' }
  })
})

test('merges nested namespaces with the same rules', () => {
  const base = { ns: { keep: 'K', gone: 'G' } }
  const ours = { ns: { keep: 'K', gone: 'G', mine: 'M' } }
  const theirs = { ns: { keep: 'K', theirs: 'T' } }
  assert.deepEqual(mergeLocaleCatalogs(ours, theirs, base), {
    ns: { keep: 'K', theirs: 'T', mine: 'M' }
  })
})
