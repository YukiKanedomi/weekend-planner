// Google マップ タイムライン（iPhone から書き出した Timeline.json）と、旬レーダーに載せた場所を照合し、
// 「載せた → 行った」を入力ゼロで知る。
// 使い方: node scripts/visits-sync.mjs [Timeline.json のパス]   （既定: マイドライブ直下の Timeline.json）
// 出力:   private/visits.json（git 管理外。滞在の日時はリポジトリにも公開ページにも出さない）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { venues } from './venues.mjs'

const tlPath = process.argv[2] ?? join(homedir(), 'マイドライブ', 'Timeline.json')
if (!existsSync(tlPath)) { console.error(`Timeline.json が見つかりません: ${tlPath}`); process.exit(1) }
const geo = JSON.parse(readFileSync(new URL('../data/venues-geo.json', import.meta.url), 'utf8'))

const MIN_STAY_MIN = 20                                 // 通り過ぎを除く最低滞在時間
const RADIUS = { venue: 300, street: 400, station: 500 } // 会場の座標の精度ごとの許容距離（m）
const WIDE = /公園|山|苑|植物|寺|神社|ランド|ふ頭|フォーラム|ビッグサイト|並木|商店街|横丁|中華街/ // 敷地の広い場所
const WIDE_RADIUS = 900

const m = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(h))
}
const jstDate = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10)

// ---- タイムラインの滞在を取り出す（iPhone 形式: 配列。Android 形式: semanticSegments） ----
const raw = JSON.parse(readFileSync(tlPath, 'utf8'))
const segs = Array.isArray(raw) ? raw : raw.semanticSegments ?? []
const stays = []
for (const s of segs) {
  const v = s.visit
  if (!v?.topCandidate?.placeLocation) continue
  const type = v.topCandidate.semanticType ?? ''
  if (/^(Home|Work|INFERRED_HOME|INFERRED_WORK)$/i.test(type)) continue
  const loc = typeof v.topCandidate.placeLocation === 'string' ? v.topCandidate.placeLocation : v.topCandidate.placeLocation.latLng
  const mm = String(loc).match(/(-?\d+\.\d+)\D+(-?\d+\.\d+)/)
  if (!mm) continue
  const minutes = (new Date(s.endTime) - new Date(s.startTime)) / 60000
  if (minutes < MIN_STAY_MIN) continue
  stays.push({ lat: +mm[1], lng: +mm[2], date: jstDate(s.startTime), minutes: Math.round(minutes) })
}
const range = segs.length ? [jstDate(segs[0].startTime), jstDate(segs.at(-1).endTime ?? segs.at(-1).startTime)] : []

// ---- 照合 ----
const out = { generatedAt: new Date().toISOString(), timeline: { file: tlPath, range, stays: stays.length }, feed: [], staples: [], unlocated: [], stationOnly: [] }
for (const v of venues()) {
  const g = geo[v.key]
  if (!g) { out.unlocated.push(v.key); continue }
  // 座標が最寄り駅しかない場所は、駅の周りにいただけで当たってしまうので判定しない
  if (g.precision === 'station') { out.stationOnly.push(v.key); continue }
  const radius = WIDE.test(v.name) || ['kouen', 'yama'].includes(v.category) ? WIDE_RADIUS : RADIUS[g.precision] ?? 300
  const near = stays.filter((s) => m(g, s) <= radius)
  if (v.kind === 'feed') {
    for (const it of v.items) {
      const hits = near.filter((s) => s.date >= it.when.from && s.date <= it.when.to)
      if (!hits.length) continue
      const dates = [...new Set(hits.map((s) => s.date))]
      out.feed.push({ id: it.id, type: it.type, title: it.title, place: it.place.name, minutes: it.minutes ?? null, foundAt: it.foundAt,
        dates, afterListing: dates.some((d) => d >= it.foundAt), precision: g.precision })
    }
  } else if (near.length) {
    const dates = [...new Set(near.map((s) => s.date))].sort()
    out.staples.push({ id: v.staple.id, name: v.staple.name, category: v.staple.category, firstSeen: v.staple.firstSeen,
      dates, afterListing: dates.filter((d) => d >= v.staple.firstSeen).length, precision: g.precision })
  }
}
mkdirSync(new URL('../private/', import.meta.url), { recursive: true })
writeFileSync(new URL('../private/visits.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')

// ---- 報告 ----
console.log(`タイムライン ${range.join('〜')}、${MIN_STAY_MIN}分以上の滞在 ${stays.length} 件`)
console.log(`\n[新着] 会期中に行った: ${out.feed.length} 件`)
for (const f of out.feed) console.log(`  ${f.afterListing ? '載せた後' : '載せる前'}  ${f.dates.join(',')}  ${f.title}（${f.place}）`)
console.log(`\n[定番] 行ったことがある: ${out.staples.length} / ${venues().filter((v) => v.kind === 'staple').length} 件`)
for (const s of out.staples.sort((a, b) => b.dates.length - a.dates.length)) console.log(`  ${String(s.dates.length).padStart(3)}日  最後 ${s.dates.at(-1)}  ${s.name}`)
if (out.stationOnly.length) console.log(`
座標が駅しかなく判定を保留: ${out.stationOnly.length} 件（${out.stationOnly.map((k) => k.split(':')[1]).join(' / ')}）`)
if (out.unlocated.length) console.log(`\n座標なしで照合できなかった場所: ${out.unlocated.join(' / ')}`)
