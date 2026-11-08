// 載せた場所の座標を OpenStreetMap（Nominatim）で引き、data/venues-geo.json に足す。
// 会場の座標は公知の情報なので公開リポジトリに置いてよい（ふたりの滞在記録は置かない）。
// 使い方: node scripts/geocode-venues.mjs   （未登録の場所だけ引く。1 秒 1 件の利用規約を守る）
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { venues } from './venues.mjs'

const file = new URL('../data/venues-geo.json', import.meta.url)
const geo = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
const HASHIMOTO = [35.5946, 139.345]
const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=jp&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'weekend-planner/2.0 (personal use)' } })
  await sleep(1100)
  if (!res.ok) return null
  const d = (await res.json())[0]
  if (!d) return null
  const p = [Number(d.lat), Number(d.lon)]
  return km(HASHIMOTO, p) < 200 ? { lat: +p[0].toFixed(6), lng: +p[1].toFixed(6), osm: d.display_name.slice(0, 80) } : null
}

// 会場名の言い換え候補: そのまま → 括弧・階数・売場を落とす → 最初の語 → 駅（精度は駅）
function queries(v) {
  const base = v.name.replace(/[（(][^）)]*[）)]/g, ' ').replace(/\s+\d+F.*$|\s+地下.*$|\s+\d+階.*$/, '').trim()
  const first = base.split(/[\s・／/]/)[0]
  const qs = [[v.name, 'venue'], [base, 'venue'], [first, 'venue']]
  if (v.area && first !== v.area) qs.push([`${first} ${v.area}`, 'venue'])
  if (v.station) qs.push([v.station, 'station'])
  return qs.filter(([q], i, a) => q && a.findIndex(([x]) => x === q) === i)
}

let added = 0
for (const v of venues()) {
  if (geo[v.key]) continue
  for (const [q, precision] of queries(v)) {
    const hit = await search(q)
    if (hit) { geo[v.key] = { ...hit, precision, q }; added++; console.log(`${precision.padEnd(7)} ${v.key} ← ${q} → ${hit.osm}`); break }
  }
  if (!geo[v.key]) console.log(`MISS    ${v.key}`)
}
writeFileSync(file, JSON.stringify(geo, null, 2) + '\n')
console.log(`added ${added}, total ${Object.keys(geo).length}`)
