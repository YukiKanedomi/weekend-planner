// フィードバックの設定リンクを作る: node scripts/feedback-link.mjs <受け口のURL> <名前>
// 合言葉は private/feedback-key.txt から読む。出たリンクを、その人のスマホで 1 回だけ開く。
import { readFileSync } from 'node:fs'
const [url, who = ''] = process.argv.slice(2)
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url ?? '')) { console.error('受け口の URL（https://script.google.com/macros/s/…/exec）を渡してください'); process.exit(1) }
const key = readFileSync(new URL('../private/feedback-key.txt', import.meta.url), 'utf8').trim()
const b64 = Buffer.from(JSON.stringify([url, key, who]), 'utf8').toString('base64url')
console.log(`https://yukikanedomi.github.io/weekend-planner/#fb=${b64}`)
