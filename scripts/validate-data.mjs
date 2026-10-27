// data/feed.json と data/staples.json のスキーマ検証（prebuild で実行）。
// 毎朝の自動更新（ヘッドレス Opus）が形式を崩しても、ビルドで止めて壊れたページを公開しない。
import { readFileSync } from 'node:fs'

const TYPES = ['event', 'food', 'shop']
const CATEGORIES = ['yama', 'onsen', 'kouen', 'machi', 'cafe', 'pan', 'sweets', 'tenji', 'yoru', 'umi', 'animal', 'taiken', 'shop', 'food']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const errors = []
const err = (path, msg) => errors.push(`${path}: ${msg}`)
const load = (name) => {
  try {
    return JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'))
  } catch (e) {
    console.error(`${name} が JSON として読めません: ${e.message}`)
    process.exit(1)
  }
}
const str = (p, v, allowNull = false) => {
  if (allowNull && v === null) return
  if (typeof v !== 'string' || !v.trim()) err(p, '非空の文字列が必要')
}

// ---- feed.json ----
const feed = load('feed.json')
if (typeof feed.meta?.updated !== 'string') err('feed.meta.updated', '文字列が必要')
if (!Array.isArray(feed.items)) err('feed.items', '配列が必要')
const seenId = new Set(), seenUrl = new Set(), seenKey = new Set()
for (const [i, it] of (feed.items ?? []).entries()) {
  const p = `feed.items[${i}]`
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(it.id ?? '')) err(`${p}.id`, `YYYY-MM-DD-slug 形式が必要 (got: ${it.id})`)
  if (seenId.has(it.id)) err(`${p}.id`, `重複 (${it.id})`)
  seenId.add(it.id)
  if (!TYPES.includes(it.type)) err(`${p}.type`, `${TYPES.join('|')} が必要 (got: ${it.type})`)
  str(`${p}.title`, it.title)
  str(`${p}.summary`, it.summary)
  if (!DATE.test(it.when?.from ?? '')) err(`${p}.when.from`, 'YYYY-MM-DD が必要')
  if (!DATE.test(it.when?.to ?? '')) err(`${p}.when.to`, 'YYYY-MM-DD が必要')
  if (it.when?.from && it.when?.to && it.when.from > it.when.to) err(`${p}.when`, 'from が to より後')
  str(`${p}.when.text`, it.when?.text)
  if (it.when?.open !== undefined && typeof it.when.open !== 'boolean') err(`${p}.when.open`, 'true/false が必要（終了日未発表の商品だけ true）')
  if (it.when?.open === true && !it.caveats) err(`${p}.caveats`, 'when.open の商品は caveats に「終了日は公式未発表」を書く')
  str(`${p}.place.name`, it.place?.name)
  str(`${p}.place.area`, it.place?.area)
  str(`${p}.access`, it.access)
  if (it.minutes !== undefined && it.minutes !== null && !(Number.isInteger(it.minutes) && it.minutes > 0 && it.minutes < 400)) err(`${p}.minutes`, '1〜399 の整数か null')
  str(`${p}.price`, it.price, true)
  if (!Array.isArray(it.tags)) err(`${p}.tags`, '配列が必要')
  str(`${p}.why`, it.why)
  if (!/^https?:\/\//.test(it.source?.url ?? '')) err(`${p}.source.url`, 'http(s) の URL が必要（出典なしは掲載不可）')
  str(`${p}.source.name`, it.source?.name)
  if (!DATE.test(it.source?.checkedAt ?? '')) err(`${p}.source.checkedAt`, 'YYYY-MM-DD が必要')
  str(`${p}.caveats`, it.caveats, true)
  if (!DATE.test(it.foundAt ?? '')) err(`${p}.foundAt`, 'YYYY-MM-DD が必要')
  if (typeof it.pick !== 'boolean') err(`${p}.pick`, 'true/false が必要')
  if (it.image !== undefined && it.image !== null && !/^https?:\/\//.test(it.image)) err(`${p}.image`, 'http(s) の URL か null')
  const key = `${it.title}|${it.place?.name}`
  if (seenKey.has(key)) err(`${p}`, `title＋place が重複 (${key})`)
  seenKey.add(key)
  if (it.source?.url) {
    if (seenUrl.has(it.source.url)) console.warn(`warn: ${p}.source.url が重複（同一ページの別催事なら可）: ${it.source.url}`)
    seenUrl.add(it.source.url)
  }
}

// ---- staples.json ----
const st = load('staples.json')
if (typeof st.meta?.updated !== 'string') err('staples.meta.updated', '文字列が必要')
if (!Array.isArray(st.items)) err('staples.items', '配列が必要')
const seenS = new Set()
for (const [i, s] of (st.items ?? []).entries()) {
  const p = `staples.items[${i}]`
  if (!/^[a-z0-9-]+$/.test(s.id ?? '')) err(`${p}.id`, `英小文字スラッグが必要 (got: ${s.id})`)
  if (seenS.has(s.id)) err(`${p}.id`, `重複 (${s.id})`)
  seenS.add(s.id)
  str(`${p}.name`, s.name)
  if (!CATEGORIES.includes(s.category)) err(`${p}.category`, `許容値外 (got: ${s.category})`)
  str(`${p}.area`, s.area)
  str(`${p}.access`, s.access)
  str(`${p}.summary`, s.summary)
  if (s.url !== null && !/^https?:\/\//.test(s.url ?? '')) err(`${p}.url`, 'http(s) の URL か null')
  if (!DATE.test(s.checkedAt ?? '')) err(`${p}.checkedAt`, 'YYYY-MM-DD が必要')
  if (!DATE.test(s.firstSeen ?? '')) err(`${p}.firstSeen`, 'YYYY-MM-DD が必要')
  if (!['plans-v1', 'feed', 'manual'].includes(s.from)) err(`${p}.from`, 'plans-v1|feed|manual が必要')
}

if (errors.length) {
  console.error(`データ検証に失敗（${errors.length} 件）:`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`validate-data: OK（feed ${feed.items.length} 件・staples ${st.items.length} 件）`)
