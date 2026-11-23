// 押すだけのフィードバック。宛先と合言葉は設定リンク（#fb=...）を開いた端末にだけ保存する。
// 公開リポジトリには宛先も合言葉も置かない。設定していない端末ではボタンを出さない。
const CFG = 'wp.fb.cfg', VOTES = 'wp.fb.votes', QUEUE = 'wp.fb.queue'
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 保存できない端末では送信だけ行う */ } }

// #fb=<base64url(JSON [宛先, 合言葉, 名前])> を読んで保存し、アドレスから消す
export function setupFromHash() {
  if (!applySetup(location.hash)) return false
  history.replaceState(null, '', location.pathname + location.search)
  return true
}

// 設定リンク（全体でも #fb= 以降だけでも可）を読んで保存する。ホーム画面のアイコンから開いた画面は
// ブラウザと保存場所が別なので、そちらではページ下部の欄にリンクを貼り付けて設定する
export function applySetup(text) {
  const m = String(text).trim().match(/#fb=([\w-]+)$/)
  if (!m) return false
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))
    const [url, key, who] = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || !key) return false
    write(CFG, { url, key, who: who || '' })
    return true
  } catch { return false }
}

export const feedbackReady = () => !!read(CFG, null)
export const feedbackWho = () => read(CFG, null)?.who ?? ''
export const voteOf = (id) => read(VOTES, {})[id] ?? { rate: null, reason: null, went: false }

export function saveVote(item, vote) {
  write(VOTES, { ...read(VOTES, {}), [item.id]: vote })
  write(QUEUE, [...read(QUEUE, []), { id: item.id, title: item.title, ...vote, at: new Date().toISOString() }])
  flush()
}

// 送れなかった分は端末に残し、次に開いたときに送り直す
let busy = false
export async function flush() {
  const cfg = read(CFG, null)
  if (!cfg || busy) return
  busy = true
  try {
    for (;;) {
      const q = read(QUEUE, [])
      if (!q.length) break
      await fetch(cfg.url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key: cfg.key, who: cfg.who, ...q[0] }),
      })
      write(QUEUE, read(QUEUE, []).slice(1))
    }
  } catch { /* 圏外など。次回に送る */ } finally { busy = false }
}
