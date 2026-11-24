// 「いまいち」が付いた項目を、その日のうちにイチ押し（pick）から外す。外したら meta.reactions に一文を残す。
// 元データは private/feedback.json（git 管理外）。公開されるのは「1 件外しました」という一文だけで、
// 誰が・どの項目に押したかは出さない。private が無い環境（GitHub Actions など）では何もしない。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const src = new URL('../private/feedback.json', import.meta.url)
if (!existsSync(src)) { console.log('apply-reactions: private/feedback.json が無いのでスキップ'); process.exit(0) }
const rows = JSON.parse(readFileSync(src, 'utf8')).recent ?? []
const liked = new Set(rows.filter((r) => r.rate === 'like').map((r) => r.id))
const meh = new Set(rows.filter((r) => r.rate === 'meh' && !liked.has(r.id)).map((r) => r.id))

const file = new URL('../data/feed.json', import.meta.url)
const feed = JSON.parse(readFileSync(file, 'utf8'))
let n = 0
for (const it of feed.items) if (it.pick && meh.has(it.id)) { it.pick = false; n++ }
if (n > 0) {
  const date = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10)
  const text = `「いまいち」が付いた ${n} 件を、週末のイチ押しから外しました。`
  feed.meta.reactions = [{ date, text }, ...(feed.meta.reactions ?? [])].slice(0, 6)
  writeFileSync(file, JSON.stringify(feed, null, 2) + '\n')
}
console.log(`apply-reactions: イチ押しから外した ${n} 件`)
