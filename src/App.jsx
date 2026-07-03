import { useMemo, useState } from 'react'
import plansData from '../data/plans.json'

const KIND = {
  honmei: { label: '本命', cls: 'seal-honmei' },
  honmei2: { label: '本命', cls: 'seal-honmei' },
  kaze: { label: '風', cls: 'seal-kaze' },
}

function fmtWeekend(id) {
  const sat = new Date(id + 'T00:00:00')
  const sun = new Date(sat.getTime() + 86400000)
  return `${sat.getMonth() + 1}月${sat.getDate()}日（土）・${sun.getMonth() + 1}月${sun.getDate()}日（日）`
}

function dateStamp(id, day) {
  const sat = new Date(id + 'T00:00:00')
  const d = day === 'sun' ? new Date(sat.getTime() + 86400000) : sat
  return `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`
}

function shortDate(id) {
  const sat = new Date(id + 'T00:00:00')
  return `${sat.getMonth() + 1}.${sat.getDate()}`
}

function Photo({ motif, stamp }) {
  return (
    <div className={`photo ph-${motif || 'michi'}`}>
      <span className="date">{stamp}</span>
    </div>
  )
}

function Cheki({ plan, weekendId, letter, active, onSelect }) {
  const kind = KIND[plan.kind] ?? KIND.honmei
  return (
    <button type="button" className={`cheki c${letter} ${active ? 'active' : ''}`} onClick={onSelect}>
      <span className="tape" aria-hidden="true"></span>
      <span className={`seal ${kind.cls}`}>{kind.label}</span>
      <Photo motif={plan.motif} stamp={dateStamp(weekendId, plan.day)} />
      <span className="caption">
        {plan.title}
        <small>{plan.catch}</small>
      </span>
    </button>
  )
}

function Film({ plan }) {
  return (
    <div className="filmwrap">
      <p className="label">▼ 選んだ一枚のフィルム（行程）</p>
      <div className="film">
        <span className="edge"><span>SHUMATSU 400</span></span>
        <div className="frames">
          {plan.course.map((c, i) => (
            <div className="frame" key={i}>
              <span className="no">▸{Math.floor(i / 2) + 4}{i % 2 ? 'A' : ''}</span>
              <span className="t">{c.time}</span>
              <span className="n">
                {c.url
                  ? <a href={c.url} target="_blank" rel="noreferrer">{c.spot}</a>
                  : c.spot}
              </span>
              {c.note && <span className="m">{c.note}</span>}
            </div>
          ))}
        </div>
        <span className="edge btm"><span>HASHIMOTO</span><span>{plan.id.toUpperCase().slice(-1)}-01</span></span>
      </div>
      <p className="filmnote">
        <span><b>アクセス</b> {plan.access}</span>
        <span><b>予算</b> {plan.budget}</span>
      </p>
    </div>
  )
}

function PlanNotes({ plan }) {
  return (
    <section className="notes">
      <div className="note-row">
        <span className="note-head">この一枚のわけ</span>
        <p>{plan.why}</p>
      </div>
      {plan.caveats && (
        <div className="note-row caveat">
          <span className="note-head">注意</span>
          <p>{plan.caveats}</p>
        </div>
      )}
      {plan.sources?.length > 0 && (
        <details className="sources">
          <summary>出典（開催・営業を確認したページ）</summary>
          <ul>
            {plan.sources.map((s, i) => (
              <li key={i}><a href={s} target="_blank" rel="noreferrer">{s}</a></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function OrderSlip({ weekend }) {
  const [chosen, setChosen] = useState('')
  const [went, setWent] = useState('')
  const [memo, setMemo] = useState('')
  const [copied, setCopied] = useState(false)
  const letters = weekend.plans.map((_, i) => 'abc'[i])

  const buildText = () => {
    const payload = {
      weekend: weekend.id,
      chosen: chosen || 'none',
      went: went === 'yes',
      memo: memo.trim(),
    }
    const label = chosen
      ? `案${chosen.toUpperCase()}「${weekend.plans[letters.indexOf(chosen)]?.title ?? ''}」`
      : '選ばなかった'
    return [
      `/learn ${fmtWeekend(weekend.id)}の選択: ${label} / ${went === 'yes' ? '行った' : '行かなかった'}${memo.trim() ? ` / ${memo.trim()}` : ''}`,
      JSON.stringify(payload),
    ].join('\n')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('コピーできませんでした。以下を手動でコピーしてください', buildText())
    }
  }

  return (
    <section className="slip">
      <h2 className="slip-title">現像注文票 <small>— 選択をコピーしてチャットに貼ると、好みが育ちます</small></h2>
      <div className="slip-row">
        <span className="slip-label">選んだ一枚</span>
        <span className="chips">
          {letters.map((l) => (
            <button key={l} type="button" className={chosen === l ? 'chip on' : 'chip'}
              onClick={() => setChosen(chosen === l ? '' : l)}>案{l.toUpperCase()}</button>
          ))}
          <button type="button" className={chosen === '' ? 'chip on' : 'chip'} onClick={() => setChosen('')}>なし</button>
        </span>
      </div>
      <div className="slip-row">
        <span className="slip-label">行った?</span>
        <span className="chips">
          <button type="button" className={went === 'yes' ? 'chip on' : 'chip'} onClick={() => setWent('yes')}>行った</button>
          <button type="button" className={went === 'no' ? 'chip on' : 'chip'} onClick={() => setWent('no')}>行かなかった</button>
        </span>
      </div>
      <textarea className="slip-memo" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)}
        placeholder="一言感想（例: 蕎麦がおいしかった、歩きすぎた…）" />
      <button type="button" className="copy-btn" onClick={copy}>
        {copied ? 'コピーしました — チャットに貼ってください' : '選択をコピー'}
      </button>
    </section>
  )
}

function Album({ weekends, currentId, onPick }) {
  if (weekends.length === 0) return null
  return (
    <section className="album">
      <p className="label">現像済みアルバム（これまでの週末）</p>
      <div className="row">
        {weekends.map((w, i) => {
          const chosenIdx = 'abc'.indexOf(w.feedback?.chosen ?? '')
          const p = chosenIdx >= 0 ? w.plans[chosenIdx] : w.plans[0]
          const went = w.feedback?.went
          return (
            <button type="button" key={w.id} className={`mini m${(i % 2) + 1} ${w.id === currentId ? 'active' : ''}`}
              onClick={() => onPick(w.id)}>
              <span className="corner tl" aria-hidden="true"></span>
              <span className="corner br" aria-hidden="true"></span>
              <Photo motif={p?.motif} stamp="" />
              <span className="caption">{shortDate(w.id)} {p?.title ?? ''}</span>
              {went && <span className="zumi">現像<br />済</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function App() {
  const weekends = useMemo(
    () => [...plansData.weekends].sort((a, b) => (a.id < b.id ? 1 : -1)),
    [],
  )
  const [currentId, setCurrentId] = useState(weekends[0]?.id)
  const [planIdx, setPlanIdx] = useState(0)

  const weekend = weekends.find((w) => w.id === currentId)
  const isLatest = weekend && weekends[0] && weekend.id === weekends[0].id
  const plan = weekend?.plans[Math.min(planIdx, (weekend?.plans.length ?? 1) - 1)]

  return (
    <div className="stage">
      <header>
        <p className="eyebrow"><span>週末プランナー ・ 橋本駅起点</span><span className="no">No.{String(weekends.length).padStart(3, '0')}</span></p>
        <h1>週末、どれ撮る？</h1>
        {weekend ? (
          <p className="sub">
            <span>{fmtWeekend(weekend.id)}</span>
            {weekend.weather && (
              <span className="w"><b>土</b> {weekend.weather.sat} / <b>日</b> {weekend.weather.sun}</span>
            )}
            {weekend.weather && <span className="yoho">予報・{weekend.weather.checkedAt}時点</span>}
          </p>
        ) : (
          <p className="sub"><span>まだプランがありません。金曜の /plan をお待ちください。</span></p>
        )}
      </header>

      {weekend && (
        <>
          <div className="prints">
            {weekend.plans.map((p, i) => (
              <Cheki key={p.id} plan={p} weekendId={weekend.id} letter={i + 1}
                active={i === planIdx} onSelect={() => setPlanIdx(i)} />
            ))}
          </div>

          {plan && <Film plan={plan} />}
          {plan && <PlanNotes plan={plan} />}

          {isLatest && <OrderSlip weekend={weekend} />}
        </>
      )}

      <Album weekends={weekends.slice(1)} currentId={currentId}
        onPick={(id) => { setCurrentId(id); setPlanIdx(0) }} />
      {!isLatest && weekend && (
        <p className="backrow">
          <button type="button" className="chip" onClick={() => { setCurrentId(weekends[0].id); setPlanIdx(0) }}>
            ← 今週末にもどる
          </button>
        </p>
      )}

      <footer>
        行った週末は「現像済み」になって、アルバムが育ちます。<br />
        写真エリアは絵（イメージ）。天気は予報です。営業・開催情報は出典の調査日時点のもの——お出かけ前に公式をご確認ください。
      </footer>
    </div>
  )
}
