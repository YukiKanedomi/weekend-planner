# weekend-planner v2「旬レーダー」

夫婦 2 人（橋本駅起点・電車・日帰り）のための、**毎朝自動更新される「直近のイベント・旬の食・買い物」の新着ページ**。
期限のあるものは「新着」、いつでも行けるものは「定番」に蓄積する。閲覧専用。正典は `CLAUDE.md`（SPEC v2）。

- 配信ページ: https://yukikanedomi.github.io/weekend-planner/
- 自動更新: タスクスケジューラ `WeekendPlanner-DailyFeed`（毎日 7:00）→ `scripts/daily-feed.ps1` → `claude -p`（Opus）が `scripts/daily-prompt.txt` の手順で `data/feed.json` を更新し push。GitHub Actions が再ビルドして公開。
  - 状態: `Get-ScheduledTaskInfo -TaskName 'WeekendPlanner-DailyFeed'`／ログ: `scripts/daily-feed.log`
  - 止める: `Disable-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed'`
  - 手動で回す: セッションで `/feed`
- データ: `data/feed.json`（期限あり・出典必須）、`data/staples.json`（定番）、`data/taste-profile.md`（好み・NG、手で更新）、`data/wishlist.md`。手で変えたら `node scripts/validate-data.mjs`。
- 開発: `npm run dev`／`npm run build`（prebuild でデータ検証）。

## 履歴
- 2026-07-03: v1 着工・公開（金曜に週末 3 案・選択で好みが育つ「チェキと現像」デザイン）。
- 2026-08-09: 配信をローカル定時ジョブ（金曜 17:00）に移行。
- 2026-10-25: **v2 に全面改訂**。16 週運用して感想の往復が 1 回しか起きなかったため、学習ループを廃し「毎朝の旬レーダー」に転換。デザインは design-dojo（実例採集→本命/対案）で Time Out Tokyo × Luma 系の白地・季節色 1 色・日付タイムライン案を採択。v1 の資産は `archive/v1/`。
