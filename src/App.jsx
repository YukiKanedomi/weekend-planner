import { useEffect, useMemo, useState } from 'react'
import feedData from '../data/feed.json'
import staplesData from '../data/staples.json'
import {
  TYPE, CATEGORY, WD, md, mdw, ymd, parseYmd, addDays, daysBetween,
  seasonOf, minutesOf, wmo, groupFeed,
} from './lib.js'

const ICONS = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>,
  suncloud: <><circle cx="8" cy="9" r="3.2" /><path d="M8 3v1.5M3 9h1.5M4.5 5.5l1 1" /><path d="M10 19H7.5a3.5 3.5 0 0 1-.6-6.95A5 5 0 0 1 16.5 11 3.5 3.5 0 0 1 16 19h-6z" /></>,
  cloud: <path d="M7 17a4 4 0 1 1 1-7.9A5 5 0 0 1 17.5 11 3 3 0 0 1 17 17H7z" />,
  rain: <><path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" /></>,
  snow: <><path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M9 19h.01M13 19h.01M17 19h.01M11 21h.01M15 21h.01" /></>,
  list: <path d="M4 6h16M4 12h10M4 18h7" />,
  pin: <><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  ext: <path d="M14 5h5v5M19 5l-8 8M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />,
  chev: <path d="M6 9l6 6 6-6" />,
}
const Icon = ({ k, className = '' }) => (
  <svg className={`ic ${className}`} viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg>
)

export default function App() {
  const feed = feedData, staples = staplesData
  const isStaplesUrl = () => location.hash === '#staples' || new URLSearchParams(location.search).get('tab') === 'staples'
  const [tab, setTab] = useState(() => (isStaplesUrl() ? 'staples' : 'feed'))
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const season = seasonOf(today)

  useEffect(() => {
    document.documentElement.style.setProperty('--season', season.hex)
  }, [])
  useEffect(() => {
    const onHash = () => setTab(isStaplesUrl() ? 'staples' : 'feed')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (t) => { location.hash = t === 'staples' ? '#staples' : ''; setTab(t); window.scrollTo({ top: 0 }) }

  return (
    <div className="app">
      {tab === 'feed'
        ? <Feed feed={feed} today={today} season={season} />
        : <Staples staples={staples} today={today} />}
      <nav className="tabbar" aria-label="ページ切替">
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => go('feed')}><Icon k="list" />新着</button>
        <button className={tab === 'staples' ? 'on' : ''} onClick={() => go('staples')}><Icon k="pin" />定番</button>
      </nav>
    </div>
  )
}

/* ---------------- 新着 ---------------- */

function Feed({ feed, today, season }) {
  const [filter, setFilter] = useState('all')
  const [onlyWeekend, setOnlyWeekend] = useState(false)
  const items = useMemo(() => (feed?.items ?? []).filter((it) => filter === 'all' || it.type === filter), [feed, filter])
  const g = useMemo(() => groupFeed(items, today), [items, today])
  const pick = useMemo(() => {
    const all = feed?.items ?? []
    const cands = all.filter((it) => it.pick && parseYmd(it.when.to) >= today)
    return cands.sort((a, b) => a.when.to.localeCompare(b.when.to))[0] ?? null
  }, [feed, today])
  const updated = feed?.meta?.updated ? new Date(feed.meta.updated) : null
  const newToday = (feed?.items ?? []).filter((it) => it.foundAt === ymd(today)).length
  const staleHours = updated ? (Date.now() - updated.getTime()) / 36e5 : 0

  return (
    <main className="feed">
      <header className="top">
        <div className="brand"><i /> 旬レーダー</div>
        <div className="base">橋本駅起点{updated && ` · ${md(updated)} ${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')} 更新`}</div>
      </header>
      <section className="today">
        <div className="date num">{today.getMonth() + 1}.{today.getDate()}<small>{WD[today.getDay()]}</small></div>
        <div className="lede">
          {feed ? <>
            {g.weekend.length > 0 ? <>今週末に行けるものが <b className="num">{g.weekend.length}</b> 件</> : <>この週末の予定はまだありません</>}
            {newToday > 0 && <><br />今朝 <b className="num">{newToday}</b> 件追加</>}
          </> : '読み込み中…'}
        </div>
      </section>
      {staleHours > 36 && (
        <div className="stale">自動更新が止まっているかもしれません。最終更新は {md(updated)} です（ログ: scripts/daily-feed.log）。</div>
      )}
      <Weather today={today} sat={g.sat} />

      <div className="chips" role="tablist" aria-label="種類で絞る">
        {[['all', 'すべて'], ['event', '行く'], ['food', '食べる'], ['shop', '買う']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        <span className="chip-sep" />
        <button className={`chip q ${onlyWeekend ? 'on' : ''}`} aria-pressed={onlyWeekend} onClick={() => setOnlyWeekend((v) => !v)}>今週末だけ</button>
      </div>

      {pick && filter === 'all' && !onlyWeekend && <Hero item={pick} today={today} label={parseYmd(pick.when.from) > g.sun ? '来週末' : '今週末'} />}

      {feed && (
        <div className="tl">
          <Group title="今週末に行ける" sub={`${mdw(g.sat)}・${mdw(g.sun)}`} items={g.weekend} today={today} empty="この種類では、今週末に行けるものがまだありません。" />
          {!onlyWeekend && g.weekdayOnly.length > 0 && <Group title="平日のうちに" sub="週末より前に終わるもの" items={g.weekdayOnly} today={today} />}
          {!onlyWeekend && <Group title="来週末" sub={`${mdw(g.sat2)}・${mdw(g.sun2)}`} items={g.nextWeekend} today={today} />}
          {!onlyWeekend && <Group title="その先" sub={`${mdw(addDays(g.sun2, 1))} 以降に始まる`} items={g.later} today={today} />}
        </div>
      )}
      <footer className="foot">
        <p>載せているのは、公式ページなどで開催日・提供期間を確認できたものだけです。価格や時間は確認日時点のもので、変わることがあります。各項目の「公式を開く」で最新をご確認ください。</p>
        <p>天気は Open-Meteo の予報です。毎朝 7 時ごろに自動更新。{season.name}の色で表示しています。</p>
      </footer>
    </main>
  )
}

function Weather({ today, sat }) {
  const [wx, setWx] = useState(null)
  useEffect(() => {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.5946&longitude=139.3450&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=10'
    fetch(url).then((r) => r.json()).then((j) => {
      const map = {}
      j.daily.time.forEach((t, i) => { map[t] = { code: j.daily.weather_code[i], tmax: j.daily.temperature_2m_max[i], pop: j.daily.precipitation_probability_max[i] } })
      setWx({ map, at: new Date() })
    }).catch(() => setWx({ map: null }))
  }, [])
  if (!wx || !wx.map) return null
  const days = [sat, addDays(sat, 1), addDays(sat, 7), addDays(sat, 8)].filter((d) => d >= today)
  const isToday = (d) => ymd(d) === ymd(today)
  return (
    <section className="wx" aria-label="週末の天気予報">
      <div className="wx-row">
        {days.map((d) => {
          const w = wx.map[ymd(d)]
          if (!w) return <div key={ymd(d)} className="wx-cell none"><b>{mdw(d)}</b><span className="t">—</span></div>
          const { text, icon } = wmo(w.code)
          return (
            <div key={ymd(d)} className={`wx-cell ${isToday(d) ? 'is-today' : ''}`} title={text}>
              <b>{isToday(d) ? '今日' : mdw(d)}</b>
              <div className="wx-main"><Icon k={icon} /><span className="t num">{Math.round(w.tmax)}°</span></div>
              <span className={`pop num ${w.pop >= 50 ? 'wet' : ''}`}>降水 {w.pop}%</span>
            </div>
          )
        })}
      </div>
      <div className="wx-note">予報 · Open-Meteo · {String(wx.at.getHours()).padStart(2, '0')}:{String(wx.at.getMinutes()).padStart(2, '0')} 取得 · 最高気温と降水確率</div>
    </section>
  )
}

function Hero({ item, today, label }) {
  const [open, setOpen] = useState(false)
  const mins = minutesOf(item)
  const t = TYPE[item.type]
  return (
    <section className="hero-wrap">
      <div className="sec"><h2>{label}の<em>イチ押し</em></h2></div>
      <article className={`hero ${item.image ? 'has-img' : 'no-img'}`} onClick={() => setOpen((v) => !v)}>
        {item.image && <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.parentElement.classList.replace('has-img', 'no-img'); e.currentTarget.remove() }} />}
        <div className="hero-bg num" aria-hidden="true">{md(parseYmd(item.when.from)).replace('/', '.')}<span>→</span>{md(parseYmd(item.when.to)).replace('/', '.')}</div>
        {mins && <div className="min"><span className="n num">{mins}</span><span className="u">分</span></div>}
        <div className="ov">
          <div className="eyebrow">{t.label} · {item.when.text}</div>
          <h3>{item.title}</h3>
          <p>{item.place.name}{item.price ? ` · ${item.price}` : ''}</p>
        </div>
      </article>
      {open && <Detail item={item} />}
    </section>
  )
}

function Group({ title, sub, items, today, empty }) {
  if (items.length === 0 && !empty) return null
  return (
    <section className="group">
      <div className="day"><b>{title}</b><span>{sub}</span><span className="cnt num">{items.length}</span></div>
      {items.length === 0 && <p className="empty">{empty}</p>}
      {items.map((it, i) => <Row key={it.id} item={it} today={today} i={i} />)}
    </section>
  )
}

function Row({ item, today, i }) {
  const [open, setOpen] = useState(false)
  const mins = minutesOf(item)
  const t = TYPE[item.type]
  const from = parseYmd(item.when.from), to = parseYmd(item.when.to)
  const started = from <= today
  const left = daysBetween(today, to)
  const dateLabel = started
    ? (left === 0 ? '今日まで' : left === 1 ? '明日まで' : `${md(to)}まで`)
    : `${md(from)}(${WD[from.getDay()]})${ymd(from) === ymd(to) ? '' : '〜'}`
  const isNew = item.foundAt === ymd(today)
  return (
    <article className={`row ${open ? 'open' : ''}`} style={{ '--i': i }}>
      <button className="row-main" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="left">
          {mins ? <><span className="n num">{mins}</span><span className="u">分</span></> : <span className="n num">—</span>}
          <span className="dt">{dateLabel}</span>
        </div>
        <div className="body">
          <div className="eyebrow" style={{ color: t.hex }}>{isNew && <i className="new" title="今朝追加" />}{t.label} · {item.when.text}</div>
          <h4>{item.title}</h4>
          <div className="meta"><b>{item.place.name}</b>{item.price ? ` · ${item.price}` : ''}</div>
          <div className="sum">{item.summary}</div>
        </div>
        <Thumb item={item} />
      </button>
      {open && <Detail item={item} />}
    </article>
  )
}

function Thumb({ item }) {
  const [broken, setBroken] = useState(false)
  const t = TYPE[item.type]
  if (item.image && !broken) return <img className="thumb" src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  const d = parseYmd(item.when.from)
  return (
    <div className="thumb tile" style={{ '--c': t.hex }} aria-hidden="true">
      <span className="m num">{d.getMonth() + 1}</span>
      <span className="d num">{d.getDate()}</span>
    </div>
  )
}

function Detail({ item }) {
  return (
    <div className="detail">
      <p className="why">{item.why}</p>
      <dl>
        <dt>行き方</dt><dd>{item.access}</dd>
        {item.place.station && <><dt>最寄り</dt><dd>{item.place.station}</dd></>}
        {item.caveats && <><dt>注意</dt><dd>{item.caveats}</dd></>}
        {item.tags?.length > 0 && <><dt>タグ</dt><dd>{item.tags.join('・')}</dd></>}
      </dl>
      <div className="src">
        <span>{item.source.checkedAt.slice(5).replace('-', '/')} に確認 · {item.source.name}</span>
        <a href={item.source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>公式を開く <Icon k="ext" /></a>
      </div>
    </div>
  )
}

/* ---------------- 定番 ---------------- */

function Staples({ staples, today }) {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const items = useMemo(() => {
    let a = staples?.items ?? []
    if (cat !== 'all') a = a.filter((s) => s.category === cat)
    if (q.trim()) a = a.filter((s) => (s.name + s.area + s.summary + (s.best || '')).includes(q.trim()))
    return [...a].sort((x, y) => (minutesOf(x) ?? 999) - (minutesOf(y) ?? 999))
  }, [staples, cat, q])
  const cats = useMemo(() => {
    const c = {}
    for (const s of staples?.items ?? []) c[s.category] = (c[s.category] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [staples])
  const month = today.getMonth() + 1
  const seasonal = (staples?.items ?? []).filter((s) => s.best && s.best.includes(`${month}月`))

  return (
    <main className="staples">
      <header className="top">
        <div className="brand"><i /> 旬レーダー</div>
        <div className="base">定番 · いつでも行けるところ</div>
      </header>
      <section className="today">
        <div className="date num">{staples ? staples.items.length : '—'}<small>件</small></div>
        <div className="lede">これまでに提案して、いつでも行ける場所。<br />橋本から近い順。</div>
      </section>
      <div className="search"><input type="search" placeholder="名前・エリアで探す" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips" aria-label="種類で絞る">
        <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>すべて</button>
        {cats.map(([k, n]) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{CATEGORY[k]} <span className="num cnt-in">{n}</span></button>)}
      </div>
      {seasonal.length > 0 && cat === 'all' && !q && (
        <section className="group">
          <div className="day"><b>{month}月が見ごろ</b><span>定番のうち、いまの季節に</span></div>
          {seasonal.map((s, i) => <StapleRow key={s.id} s={s} i={i} />)}
        </section>
      )}
      <section className="group">
        <div className="day"><b>{cat === 'all' ? 'すべて' : CATEGORY[cat]}</b><span>橋本から近い順</span><span className="cnt num">{items.length}</span></div>
        {items.length === 0 && <p className="empty">見つかりませんでした。</p>}
        {items.map((s, i) => <StapleRow key={s.id} s={s} i={i} />)}
      </section>
      <footer className="foot"><p>過去の提案やフィードから「期限のないもの」を蓄積しています。営業状況は変わることがあるので、行く前に公式をご確認ください。</p></footer>
    </main>
  )
}

function StapleRow({ s, i }) {
  const [open, setOpen] = useState(false)
  const mins = minutesOf(s)
  return (
    <article className={`row ${open ? 'open' : ''}`} style={{ '--i': i }}>
      <button className="row-main" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="left">
          {mins ? <><span className="n num">{mins}</span><span className="u">分</span></> : <span className="n num">—</span>}
          <span className="dt">{s.area}</span>
        </div>
        <div className="body">
          <div className="eyebrow mute">{CATEGORY[s.category]}{s.best ? ` · ${s.best}` : ''}</div>
          <h4>{s.name}</h4>
          <div className="sum">{s.summary}</div>
        </div>
        <Icon k="chev" className="chev" />
      </button>
      {open && (
        <div className="detail">
          <dl>
            <dt>行き方</dt><dd>{s.access}</dd>
            {s.station && <><dt>最寄り</dt><dd>{s.station}</dd></>}
            {s.note && <><dt>メモ</dt><dd>{s.note}</dd></>}
          </dl>
          <div className="src">
            <span>初出 {s.firstSeen.slice(0, 7).replace('-', '/')} · 確認 {s.checkedAt.slice(5).replace('-', '/')}</span>
            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">公式を開く <Icon k="ext" /></a> : <span>公式URLなし</span>}
          </div>
        </div>
      )}
    </article>
  )
}
