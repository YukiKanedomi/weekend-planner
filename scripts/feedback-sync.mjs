// ページのボタンで届いたフィードバック（Google ドライブの feedback.jsonl）を集計して private/feedback.json に置く。
// 好みの記録なので公開リポジトリには出さない。毎朝のジョブがこの集計を読んで調べ方を変える。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { allFeedItems } from './venues.mjs'

const SRC = process.env.FEEDBACK_FILE ?? 'C:/Users/kanedomi/マイドライブ/Claude成果物/weekend-planner/feedback/feedback.jsonl'
const OUT = new URL('../private/feedback.json', import.meta.url)

if (!existsSync(SRC)) { console.log('feedback-sync: まだ届いていません（ファイルなし）'); process.exit(0) }

// 同じ人が同じ項目を押し直したら、最後の 1 件だけを使う
const latest = new Map()
for (const line of readFileSync(SRC, 'utf8').split('\n')) {
  if (!line.trim()) continue
  try { const e = JSON.parse(line); latest.set(`${e.who}|${e.id}`, e) } catch { /* 壊れた行は飛ばす */ }
}
const items = new Map(allFeedItems().map((it) => [it.id, it]))
const votes = [...latest.values()].filter((e) => e.rate || e.went)

const tally = () => ({ like: 0, meh: 0, went: 0 })
const by = { type: {}, scoop: {}, area: {}, minutes: {} }
const bump = (group, k, e) => {
  const t = (by[group][k] ??= tally())
  if (e.rate) t[e.rate]++
  if (e.went) t.went++
}
const reasons = {}
const rows = []
for (const e of votes) {
  const it = items.get(e.id)
  if (e.reason) reasons[e.reason] = (reasons[e.reason] || 0) + 1
  if (it) {
    bump('type', it.type, e)
    bump('scoop', it.scoop ?? 'なし', e)
    bump('area', it.usual ?? it.place?.area ?? '不明', e)
    bump('minutes', it.minutes == null ? '不明' : it.minutes <= 30 ? '30分以内' : it.minutes <= 60 ? '31〜60分' : '61分以上', e)
  }
  rows.push({ ts: e.ts, who: e.who, id: e.id, title: it?.title ?? e.title, rate: e.rate, reason: e.reason, went: e.went, type: it?.type ?? null, minutes: it?.minutes ?? null })
}
rows.sort((a, b) => (a.ts < b.ts ? 1 : -1))

mkdirSync(new URL('../private/', import.meta.url), { recursive: true })
writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: rows.length,
  totals: { like: rows.filter((r) => r.rate === 'like').length, meh: rows.filter((r) => r.rate === 'meh').length, went: rows.filter((r) => r.went).length },
  reasons, by,
  recent: rows.slice(0, 60),
}, null, 2) + '\n')
console.log(`feedback-sync: ${rows.length} 件（気になる ${rows.filter((r) => r.rate === 'like').length}・いまいち ${rows.filter((r) => r.rate === 'meh').length}・行った ${rows.filter((r) => r.went).length}）`)
