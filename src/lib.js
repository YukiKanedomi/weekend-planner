// 日付・季節・天気・グルーピングの小道具（表示専用。データは data/*.json が正）

export const BASE = import.meta.env.BASE_URL

export const pad2 = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const WD = ['日', '月', '火', '水', '木', '金', '土']
export const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`
export const mdw = (d) => `${md(d)}(${WD[d.getDay()]})`

// 今日を含む「次の土日」。今日が土曜なら今日と明日、日曜なら今日だけ（＝土は昨日）。
export function upcomingWeekend(today) {
  const dow = today.getDay()
  if (dow === 6) return [today, addDays(today, 1)]
  if (dow === 0) return [addDays(today, -1), today]
  const sat = addDays(today, 6 - dow)
  return [sat, addDays(sat, 1)]
}

export const daysBetween = (a, b) => Math.round((b - a) / 86400000)

// 季節色（「旬」が題材なので、ブランド色は季節で替える）
export function seasonOf(d) {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return { key: 'spring', name: '春', hex: '#D8577A' }
  if (m >= 6 && m <= 8) return { key: 'summer', name: '夏', hex: '#1E8A8F' }
  if (m >= 9 && m <= 11) return { key: 'autumn', name: '秋', hex: '#D9541E' }
  return { key: 'winter', name: '冬', hex: '#2B4C8C' }
}

export const TYPE = {
  event: { label: '行く', hex: '#D9541E' },
  food: { label: '食べる', hex: '#B07A12' },
  shop: { label: '買う', hex: '#2E6B8A' },
}

export const CATEGORY = {
  yama: '山・ハイキング', onsen: '温泉・スパ', kouen: '公園・庭園', machi: '街・商店街',
  cafe: 'カフェ', pan: 'パン', sweets: 'スイーツ', tenji: '展示・ミュージアム', yoru: '夜',
  umi: '海・川', animal: '動物', taiken: '体験', shop: 'お店', food: '食',
}

// 「橋本から N 分」の数字。minutes が無ければ access の文字列から拾う
export function minutesOf(item) {
  if (Number.isFinite(item.minutes)) return item.minutes
  const s = item.access || ''
  const m = s.match(/(\d{1,3})\s*分/g)
  if (!m) return null
  // 「約70分」「40〜50分」などから最後の数字（合計に近いことが多い）を採る
  const last = m[m.length - 1].match(/(\d{1,3})/)
  return last ? Number(last[1]) : null
}

// WMO weather code → 文字と線画アイコンのキー
export function wmo(code) {
  if (code === 0) return { text: '晴れ', icon: 'sun' }
  if (code === 1 || code === 2) return { text: '晴れ時々くもり', icon: 'suncloud' }
  if (code === 3) return { text: 'くもり', icon: 'cloud' }
  if (code === 45 || code === 48) return { text: '霧', icon: 'cloud' }
  if (code >= 51 && code <= 57) return { text: '霧雨', icon: 'rain' }
  if (code >= 61 && code <= 67) return { text: '雨', icon: 'rain' }
  if (code >= 71 && code <= 77) return { text: '雪', icon: 'snow' }
  if (code >= 80 && code <= 82) return { text: 'にわか雨', icon: 'rain' }
  if (code >= 95) return { text: '雷雨', icon: 'rain' }
  return { text: '—', icon: 'cloud' }
}

// 期間が [a,b] と交差するか
const overlaps = (from, to, a, b) => from <= b && to >= a

// フィードを「今週末に行ける／来週末／その先」に分ける
export function groupFeed(items, today) {
  const [sat, sun] = upcomingWeekend(today)
  const sat2 = addDays(sat, 7), sun2 = addDays(sun, 7)
  const g = { weekend: [], nextWeekend: [], later: [], weekdayOnly: [] }
  for (const it of items) {
    const from = parseYmd(it.when.from), to = parseYmd(it.when.to)
    if (to < today) continue
    if (overlaps(from, to, sat, sun)) g.weekend.push(it)
    else if (to < sat) g.weekdayOnly.push(it)
    else if (overlaps(from, to, sat2, sun2)) g.nextWeekend.push(it)
    else g.later.push(it)
  }
  const byTo = (a, b) => a.when.to.localeCompare(b.when.to) || a.when.from.localeCompare(b.when.from)
  const byFrom = (a, b) => a.when.from.localeCompare(b.when.from) || a.when.to.localeCompare(b.when.to)
  g.weekend.sort(byTo)
  g.weekdayOnly.sort(byTo)
  g.nextWeekend.sort(byFrom)
  g.later.sort(byFrom)
  return { ...g, sat, sun, sat2, sun2 }
}
