// plans.json のスキーマ検証（prebuild で実行）。
// 金曜の自動配信（ヘッドレス）が形式を崩しても、ビルドで止めて壊れたページを公開しない。
import { readFileSync } from 'node:fs'

const KINDS = ['honmei', 'honmei2', 'kaze']
const MOTIFS = ['yama', 'pan', 'neko', 'kouen', 'machi', 'yoru', 'onsen', 'umi', 'tenji', 'cafe', 'michi']
const DAYS = ['sat', 'sun']
const errors = []
const err = (path, msg) => errors.push(`${path}: ${msg}`)

let data
try {
  data = JSON.parse(readFileSync(new URL('../data/plans.json', import.meta.url), 'utf8'))
} catch (e) {
  console.error(`plans.json が JSON として読めません: ${e.message}`)
  process.exit(1)
}

if (typeof data.meta?.updated !== 'string') err('meta.updated', '文字列が必要')
if (!Array.isArray(data.weekends) || data.weekends.length === 0) err('weekends', '非空の配列が必要')

for (const [i, w] of (data.weekends ?? []).entries()) {
  const p = `weekends[${i}]`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.id ?? '')) err(`${p}.id`, `YYYY-MM-DD 形式が必要 (got: ${w.id})`)
  for (const k of ['sat', 'sun', 'checkedAt']) {
    if (typeof w.weather?.[k] !== 'string' || !w.weather[k]) err(`${p}.weather.${k}`, '非空の文字列が必要')
  }
  if (!Array.isArray(w.plans) || w.plans.length !== 3) err(`${p}.plans`, `3案が必要 (got: ${w.plans?.length})`)
  if (typeof w.feedback !== 'object' || w.feedback === null) err(`${p}.feedback`, 'オブジェクトが必要')

  for (const [j, plan] of (w.plans ?? []).entries()) {
    const q = `${p}.plans[${j}]`
    if (!(plan.id ?? '').startsWith(w.id ?? '')) err(`${q}.id`, `週末ID(${w.id})始まりが必要 (got: ${plan.id})`)
    if (!KINDS.includes(plan.kind)) err(`${q}.kind`, `${KINDS.join('|')} のいずれかが必要 (got: ${plan.kind})`)
    if (!MOTIFS.includes(plan.motif)) err(`${q}.motif`, `許容値外 (got: ${plan.motif})`)
    if (!DAYS.includes(plan.day)) err(`${q}.day`, `sat|sun が必要 (got: ${plan.day})`)
    for (const k of ['title', 'catch', 'access', 'budget', 'why']) {
      if (typeof plan[k] !== 'string' || !plan[k]) err(`${q}.${k}`, '非空の文字列が必要')
    }
    if (!Array.isArray(plan.course) || plan.course.length < 2 || plan.course.length > 5) {
      err(`${q}.course`, `2〜5点のタイムラインが必要 (got: ${plan.course?.length})`)
    }
    for (const [c, stop] of (plan.course ?? []).entries()) {
      if (!stop.time || !stop.spot) err(`${q}.course[${c}]`, 'time と spot が必要')
    }
    if (!Array.isArray(plan.sources) || plan.sources.length === 0) {
      err(`${q}.sources`, '出典URLが1件以上必要（SPEC 0章: 実在確認）')
    } else if (!plan.sources.every((s) => /^https?:\/\//.test(s))) {
      err(`${q}.sources`, 'http(s) の URL のみ')
    }
  }
  // 3案の役割: 本命系2＋風1
  const kinds = (w.plans ?? []).map((x) => x.kind)
  if (kinds.filter((k) => k === 'kaze').length !== 1) err(`${p}.plans`, '風(kaze)の枠はちょうど1案必要')
}

// 週末IDの重複
const ids = (data.weekends ?? []).map((w) => w.id)
for (const id of ids) {
  if (ids.filter((x) => x === id).length > 1) err('weekends', `週末ID重複: ${id}`)
}

// events.json（次号予告の台帳）も同じ失敗モードなので併せて検証
let events
try {
  events = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf8'))
} catch (e) {
  console.error(`events.json が JSON として読めません: ${e.message}`)
  process.exit(1)
}
if (typeof events.meta?.updated !== 'string') err('events.meta.updated', '文字列が必要')
if (!Array.isArray(events.events)) err('events.events', '配列が必要')
for (const [i, ev] of (events.events ?? []).entries()) {
  const p = `events[${i}]`
  for (const k of ['id', 'title', 'dates', 'place', 'category']) {
    if (typeof ev[k] !== 'string' || !ev[k]) err(`${p}.${k}`, '非空の文字列が必要')
  }
  for (const k of ['from', 'to']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev[k] ?? '')) err(`${p}.${k}`, `YYYY-MM-DD 形式が必要 (got: ${ev[k]})`)
  }
  if (!/^https?:\/\//.test(ev.url ?? '')) err(`${p}.url`, '出典URL（http(s)）が必要')
}

if (errors.length) {
  console.error(`データ検証NG（${errors.length}件）:`)
  for (const e of [...new Set(errors)]) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`検証OK（plans: ${data.weekends.length}週末・${data.weekends.length * 3}案 / events: ${events.events.length}件）`)
