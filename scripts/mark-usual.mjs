// 掲載項目に「いつもの街」の印（usual: 街の名前）を付ける。
// 元データは private/area-affinity.json（/visits が Google マップのタイムラインから作る。git 管理外）。
// 公開されるのは「この項目はいつもの街にある」という印だけで、滞在の日時・回数は出さない。
// private が無い環境（GitHub Actions など）では何もしない。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { areaOfPlace } from './areas.mjs'

const aff = new URL('../private/area-affinity.json', import.meta.url)
if (!existsSync(aff)) { console.log('mark-usual: private/area-affinity.json が無いのでスキップ'); process.exit(0) }
const usual = new Set(JSON.parse(readFileSync(aff, 'utf8')).usual ?? [])
const file = new URL('../data/feed.json', import.meta.url)
const text = readFileSync(file, 'utf8')
const feed = JSON.parse(text)
let n = 0
for (const it of feed.items) {
  const a = areaOfPlace(it.place)
  if (a && usual.has(a)) { it.usual = a; n++ } else delete it.usual
}
const out = JSON.stringify(feed, null, 2) + '\n'
if (out !== text.replace(/\r\n/g, '\n')) writeFileSync(file, out)
console.log(`mark-usual: いつもの街 ${n} 件（${[...usual].join('・')}）`)
