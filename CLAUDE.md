# 週末プランナー v2「旬レーダー」— 設計図（SPEC）

> 2026-10-25 全面改訂。v1（金曜に週末3案・選択で好みが育つ）は 16 週運用して、感想の往復が 1 回しか
> 起きなかったため廃止。v2 は**「毎朝、直近のイベント・旬の食・買い物の新着を出典つきで教える」**専業に
> 軸を移し、何度も出てくる定番は別ページに蓄積する。閲覧専用（学習ループ・感想の往復は持たない）。

## 0. 最重要ルール — 現実に対して嘘をつかない
- 載せるのは **Web 上で開催日・提供期間・営業を確認できたものだけ**。各項目に出典 URL（公式優先）と確認日を必ず付ける。確認できないものは載せない（「要確認」で載せる逃げ道も v2 では無し。載せるか捨てるか）。
- 価格・営業時間は「調査日時点」。断定しない。
- 天気は予報であることを明示。実在しない店・イベント・限定品を 1 件でも出したら信頼を失う。

## 1. これは何
夫婦 2 人（拠点: 相模原市・橋本駅すぐ、電車移動・日帰り）のための、**毎朝自動更新される「おでかけ・食・買い物の旬レーダー」**。

- **新着（Feed）**: 期限のあるもの。向こう約 3 週間のイベント・祭り・花火・展示・ポップアップ、季節限定メニュー・旬の食材の催事、期間限定ショップ・物産展・新店オープン、**季節限定・新商品などの「商品」**（食べ物＝food、モノ＝shop）。毎朝 Opus が調査して追加し、終了したものは自動で消える。
- **定番（Staples）**: いつでも行ける・買える・食べられるもの。過去の提案やフィードから「期限のないもの」を蓄積し、カテゴリ／エリア別に一覧できる。育つ資産。
- 好み・NG は `data/taste-profile.md`（手で更新）。調査の絞り込みに使う。

## 2. 前提（確定事項）
- 拠点: 橋本駅（京王相模原線・JR 横浜線・JR 相模線）。電車前提・日帰り基本。行動圏は 1 時間圏（新宿・渋谷・横浜・八王子・高尾・町田・立川・鎌倉あたり）。遠出は「特別編」として少量なら可。
- 利用者は夫婦 2 人。奥様も読む → わかりやすさ最優先。絵文字アイコン禁止。スマホ縦画面ファースト。
- 好み・NG の正は `data/taste-profile.md`。NG（エスニック・カレー・酒主体・スポーツ観戦・要予約基本）は載せない。

## 3. アーキテクチャ
```
毎朝 7:00  Task Scheduler `WeekendPlanner-DailyFeed`
   → scripts/daily-feed.ps1 → claude -p (Opus) → data/feed.json 更新・data/staples.json 追記
   → npm run build 検証 → git push → GitHub Actions → Pages
表示: Vite + React 静的サイト。feed.json / staples.json をビルド時に静的 import して描画（base サブパス対策は deploy-pages 準拠）
天気: Open-Meteo（キー不要）。橋本駅 35.5946, 139.3450
```
- 公開 URL は従来どおり `https://yukikanedomi.github.io/weekend-planner/`（リポジトリ・URL は据え置き）。
- v1 の金曜ジョブ `WeekendPlanner-FridayPlan` は**廃止**（登録解除）。v1 の資産（plans.json・events.json・visited.json・金曜ジョブ・モチーフ画像・/plan /learn）は `archive/v1/` に移動して保存（定番の種として参照済み）。
- 表示アプリは `data/feed.json` と `data/staples.json` をビルド時に静的 import する（fetch しない）。データが変わったら push → Actions が再ビルドする。
- `feed.json`/`staples.json` を手で変えたら `node scripts/validate-data.mjs` で検証（prebuild でも走る）。

## 4. データモデル
### data/feed.json — 期限のある新着
```jsonc
{ "meta": { "area": "橋本駅起点", "updated": "2026-10-25T07:00:00+09:00" },
  "items": [ {
    "id": "2026-10-25-kanda-furuhon",         // 発見日-slug（英小文字・数字・ハイフン）
    "type": "event" | "food" | "shop",         // 行く / 食べる / 買う
    "title": "第66回 神田古本まつり",
    "summary": "1〜2文。何が・どこで・なぜ今か",
    "when": { "from": "2026-10-23", "to": "2026-11-01", "text": "10/23(金)〜11/1(日) 10:00〜18:00" },
    "place": { "name": "神保町 古書店街", "area": "神保町", "station": "神保町駅" },
    "access": "橋本→新宿（京王線 約45分）→神保町（都営新宿線 約10分）。合計約60〜70分",
    "minutes": 70,                                // 橋本駅からの所要の目安（整数・分）。並び順と「N分」表示に使う
    "price": "入場無料",                          // 調査日時点。不明なら null
    "tags": ["古本", "食べ歩き", "街ぶら"],
    "why": "好み・wishlist のどこに効くか（1文）",
    "source": { "url": "https://...", "name": "公式サイト", "checkedAt": "2026-10-25" },
    "caveats": "雨天中止・要予約・混雑など（無ければ null）",
    "image": "https://.../ogp.jpg",               // 出典ページの og:image。写真・キービジュアルのときだけ（ロゴなら null）
    "foundAt": "2026-10-25",
    "pick": true                                  // 今週末イチ押し（常に最大2件）
  } ] }
```
- **商品（2026-10-28 追加）**: 発売日を公式で確認できたものだけ載せる。終了日が公式に無い（なくなり次第終了）ときは `when.to` = 発見日＋21日、`when.open: true` とする（to はこちらの掲載期限で、終了日ではない）。`when.text` に終了日を書かず、`caveats` に「終了日は公式未発表」と書く（validate が検査）。ページは「発売中」「10/30発売」と表示する。`place` は買える店（個別店舗名は公式で確認できたときだけ）、橋本駅周辺で買えるなら minutes は 5。
- `when.to` が過去になった項目は日次ジョブが削除する（履歴は git にある）。`when.from/to` は必須（food/shop の季節限定も期間を書く。期限が無いものは feed ではなく staples へ）。
- 重複禁止: 同じ `source.url` または同じ title＋place の項目は追加しない。
- 1 日の追加は **最大 8 件**。無い日は無理に足さない。質 > 量。

### data/staples.json — 期限のない定番
```jsonc
{ "meta": { "updated": "2026-10-25" },
  "items": [ {
    "id": "takaosan",
    "name": "高尾山",
    "category": "yama" | "onsen" | "kouen" | "machi" | "cafe" | "pan" | "sweets" | "tenji" | "yoru" | "umi" | "animal" | "taiken" | "shop" | "food",
    "area": "高尾",  "station": "高尾山口駅",
    "access": "橋本→高尾山口 約25分（京王線）",
    "minutes": 25,
    "summary": "1〜2文。何が良いか",
    "best": "11月下旬の紅葉、夏の夕涼み",            // いつ行くのが良いか。無ければ null
    "url": "https://...",  "checkedAt": "2026-10-25",
    "firstSeen": "2026-07-04",                     // 初めて提案・掲載した日
    "from": "plans-v1" | "feed" | "manual",        // 出自
    "visited": false,                              // 手で更新（任意）
    "note": null
  } ] }
```
- 日次ジョブは、調査中に見つけた「期限のない良い場所・店・品」を staples に追記してよい（1 日 2 件まで。重複は name＋area で判定）。feed の項目が終了したとき、会場・店そのものが定番に値するなら staples へ移す。

### data/taste-profile.md — 好み・NG（手で更新。日次ジョブは読むだけ）

## 5. 日次ジョブの調査ルール（scripts/daily-prompt.txt が正典・ここは要約）
1. 冪等: `meta.updated` が今日なら何もしない。`git pull --ff-only` → `git status` が汚れていたら中止。
2. 期限切れ削除 → 天気（Open-Meteo 土日）取得。
3. 調査の枠（毎朝ローテーションで深掘る領域を変える。曜日で主担当を決める）
   - 月: 大型イベント・展示会（ビッグサイト級・美術展・博物館の企画展）
   - 火: 祭り・花火・季節もの（紅葉・花・イルミ）・自然
   - 水: 食（季節限定メニュー・旬の催事・新店・パン/スイーツ）＋食べ物の商品（コンビニ・カフェ・菓子店の季節限定品）
   - 木: 買い物（ポップアップ・物産展・蚤の市）＋モノの商品（雑貨・文具・季節限定パッケージ・催事の目玉品）
   - 金: この週末の総点検（pick の付け替え・天気で屋内外の目配せ）
   - 土日: 軽め（向こう 2 週の追加のみ）
   どの日も「向こう 3 週間に始まる／終わる」ものを優先。既に載っているものは再調査しない。
4. 各候補は **WebSearch → 公式ページを WebFetch** で日付を確かめ、確認できたものだけ feed に追記（source.checkedAt = 今日）。
5. `node scripts/validate-data.mjs` と `npm run build` が通ったら commit（"feed: YYYY-MM-DD 新着N件・削除M件"）→ push。失敗したら `git checkout -- data/` で戻して終了（push しない）。
6. 開発サーバは起動しない。起動したら必ず止める。MCP が無ければ黙ってスキップ。

## 6. 画面（デザインは design-dojo で決める。採択結果は `research/design-decision.md` に記録）
- **ホーム＝新着**: 今日の日付・週末の天気・「今週末のイチ押し」→ 期限の近い順の新着一覧。type（行く／食べる／買う）で絞れる。各項目は「いつ・どこ・橋本から何分・いくら・出典」が一目で分かる。
- **定番**: カテゴリ／エリアで絞る一覧。「いつ行くのが良いか（best）」を見せる。
- 詳細は展開式（別ページ遷移を増やさない）。出典リンクは必ず表示。
- 「予報」「調査日時点」の表記は UI に組み込む（0 章）。

## 7. デザインの作法
- design-dojo v3 を必ず発動（制約 → field-survey で今年の一級実例 → 本命 1＋対案 1 → 選択 → 本制作 → render-check）。
- 絵文字アイコン禁止。日本語組版は `design-dojo/mechanics/japanese-typography.md` に従う。
- 画像: v1 のグワッシュ調モチーフ（public/motifs）は v2 では使わない前提。使うなら design の判断として明記。

## 8. 運用メモ
- 状態確認: `Get-ScheduledTaskInfo -TaskName 'WeekendPlanner-DailyFeed'`。ログ: `scripts/daily-feed.log`。
- 止める: `Disable-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed'`。
- 手動で回す: `/feed`（`.claude/commands/feed.md`）。ジョブの正典は `scripts/daily-prompt.txt`。
- 画像は出典ページの og:image をリンクプレビューとして表示する（公式が配信用に用意した画像。ロゴしか無い項目は種別色のタイルで日付を見せる）。
- デザインの採択記録: `research/field-survey.md`（実例採集と文法）、`research/mock-a.html`（採択案）、`research/mock-b.html`（対案）。
- 作法の正典は `headless-job` スキル。
- **失敗しない配信の仕組み（2026-10-25）**: ランチャー `scripts/daily-feed.ps1` が Claude の後に機械的な FINALIZE 段を持つ（検証 → data/ の未コミット分を commit → pull --rebase → push を最大4回再試行）。検証に失敗したら data/ を戻して exit 4。Claude の認証切れ（v1 で2回あった唯一の失敗原因）は exit 2 で返し、タスクスケジューラの「失敗時に90分おきに最大4回再実行」で同日中にやり直す。ページ側は最終更新が36時間を超えると警告バナーを出す。
