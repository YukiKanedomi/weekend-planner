// 旬レーダーに「これまで載せたすべての場所」を集める共通部品。
// feed は期限切れで消えるので git 履歴の全版から拾い、staples は現行版から拾う。
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 })

// 店舗が特定できない商品（チェーン各店・オンライン）は場所の照合対象にしない
export const isPlaceless = (it) =>
  /各店|オンライン|全国|全\d+店舗/.test(it.place?.name ?? '') || /^橋本駅周辺の各店舗|公式オンラインストア/.test(it.access ?? '')

export function feedKey(it) { return `feed:${it.place.name}` }
export function stapleKey(s) { return `staple:${s.id}` }

export function allFeedItems() {
  const items = new Map()
  const add = (doc) => { for (const it of doc.items ?? []) if (!items.has(it.id)) items.set(it.id, it) }
  for (const h of git('log --format=%H -- data/feed.json').split('\n').filter(Boolean)) {
    try { add(JSON.parse(git(`show ${h}:data/feed.json`))) } catch { /* 壊れた版は飛ばす */ }
  }
  add(JSON.parse(readFileSync(new URL('data/feed.json', root), 'utf8')))
  return [...items.values()]
}

export function allStaples() {
  return JSON.parse(readFileSync(new URL('data/staples.json', root), 'utf8')).items
}

// 照合対象の「場所」一覧。同じ会場で複数の催事があれば 1 つの場所に束ねる
export function venues() {
  const map = new Map()
  for (const it of allFeedItems()) {
    if (isPlaceless(it)) continue
    const key = feedKey(it)
    const v = map.get(key) ?? { key, kind: 'feed', name: it.place.name, area: it.place.area, station: it.place.station, items: [] }
    v.items.push(it)
    map.set(key, v)
  }
  for (const s of allStaples()) {
    map.set(stapleKey(s), { key: stapleKey(s), kind: 'staple', name: s.name, area: s.area, station: s.station, category: s.category, staple: s })
  }
  return [...map.values()]
}
