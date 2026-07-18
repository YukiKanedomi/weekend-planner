# BACKLOG — 改善ネタ（/ideas が育てる。実装は指示があってから）

状態: `new`（未着手）/ `doing` / `done` / `skip`

## 今回のおすすめ Top3（2026-07-04）

1. **木曜配信のメール通知** — クラウドRoutineには Gmail コネクタが付与済み。配信成功時に3案の要約＋ページURLをメールすれば「配信に気づかない」問題が消える。高インパクト×工数S。
2. **plans.json のスキーマ検証を prebuild に** — 木曜の自動配信は Sonnet が JSON を書く。形式が崩れると配信ページごと壊れるので、`npm run build` 前に必須キー・kind値・出典有無を機械チェックする安全網を入れる。高×S。
3. **選択済み案の初期表示＋「先週どうでした？」リマインダー** — /learn の回答率がこのプロダクトの成長速度そのもの。feedback 未記入の先週分があればページ上部にそっと催促を出す。高×S。

## 一覧

| 状態 | 優先 | 観点 | ネタ | 効く理由 | 工数 | 着手の一歩 |
|---|---|---|---|---|---|---|
| new | ★★★ | 機能・価値 | **配信メール通知**: Routine の最終ステップで Gmail コネクタから「今週の3案」要約＋URLを自分宛に送る | 木曜20時の配信に気づける。スマホのメール→タップで開く導線が完成する | S | Routine のプロンプトに送信手順を1段追加し、mcp_connections の Gmail を permitted に |
| new | ★★★ | コード品質 | **plans.json スキーマ検証**: `scripts/validate-plans.mjs` を prebuild に挟む（必須キー・kind/motif の許容値・sources 非空・id 形式） | 自動配信（Sonnet）が形式を崩してもビルドで止まり、壊れたページが公開されない | S | Node 20行程度の検証スクリプト＋package.json に `"prebuild"` |
| new | ★★★ | UX/学習ループ | **feedback 未記入リマインダー＋chosen の初期選択**: 過去週末に feedback が無ければ「先週の現像がまだです」カードを表示。記入済みなら chosen 案を初期ハイライト | /learn の回答率が上がる＝taste-profile が育つ＝提案精度が上がる本丸 | S | App.jsx で `weekends[1]?.feedback?.chosen == null` を見て注文票を過去週末にも出す |
| new | ★★☆ | 機能・価値 | **ライブ天気帯**: ページ表示時に Open-Meteo を fetch して「いま時点の予報」を配信時予報の横に小さく出す（配信値は checkedAt 表記のまま残す） | 木曜配信→土曜朝の間に予報が変わる。当日の屋内切替判断がページ内で完結 | M | App に fetch 1本＋失敗時は静かに非表示。「予報」明示は SPEC 0章準拠 |
| new | ★★☆ | 運用 | **/replan コマンド**: 天気急変や気分で「今週末の3案を差し替え」する手動コマンド（既存 id を上書き） | 雨→晴れに変わった週の座礁を防ぐ。冪等ガードの裏口として必要になる | M | .claude/commands/replan.md を plan.md から派生 |
| new | ★★☆ | アクセシビリティ | **フィルム帯の文字を底上げ**: frame 内 7.5px/9.5px を 9px/10.5px に、note色 #A79B83 のコントラスト改善。チェキボタンに aria-pressed | スマホ実機でコースの注記が読みにくい。妻にも読みやすく＝SPEC 7章 | S | styles.css の .frame .m/.n と Cheki の aria 属性 |
| new | ★☆☆ | 磨き込み | **現像済みアルバムに日付スタンプ演出**: went=true の週末を開いたとき chosen 案のチェキに「現像済」ゴム印＋撮影日付を焼き込む | 「育つアルバム」の体感が強まる。design-dojo の世界観貫通 | S | Photo に went フラグを渡して印判 CSS を重ねる |
| new | ★☆☆ | 成長/到達 | **OGP メタタグ**: アイコン流用の OG 画像＋説明文 | 夫婦間で URL をLINE等に貼ったときの見栄え | S | index.html に og:title/og:image を追加 |
| new | ★☆☆ | 運用 | **deploy 失敗の自動リトライ**: workflow に deploy-pages 失敗時の1回再試行 step を足す | 今日実際に「try again later」を3連発した。自動配信が夜中に座礁しない保険 | S | deploy.yml に `if: failure()` の再実行 or nick retry action |
| new | ★☆☆ | 将来構想 | **メール返信で /learn**: 通知メールに返信（「A行った。蕎麦うまかった」）→ Routine が受信箱を読んで /learn を実行する完全自動の往復 | コピペ往復すら不要になる。学習ループの摩擦が最小化 | L | まず通知メール（Top3-1）を運用してから設計 |
| new | ★☆☆ | デザイン | **チェキ写真の実写化（CC素材）**: web-free-images で主目的地の実写（Wikimedia CC）をチェキに嵌める。取得失敗時は現行の絵にフォールバック | 「写真」の説得力が段違い。ただし毎週の自動調達は検品が課題 | M〜L | まず手動配信の週で1回試し、権利表記の置き場を決める |

## done / skip

（まだなし）
