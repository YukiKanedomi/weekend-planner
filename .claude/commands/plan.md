---
description: 今週末の3案（本命2＋風の枠1）を調査・生成して plans.json に追記し、配信する
---

# /plan — 週末3案の生成

CLAUDE.md（SPEC）の生成ルールに従い、**次の週末**（今日が金曜なら明日・明後日）の3案を作って配信する。
**最重要: SPEC 0章「現実に対して嘘をつかない」を厳守。** 実在確認できないスポット・イベントは載せない。

## 手順

1. **資産を読む**: `data/taste-profile.md`（好み・NG・冒険枠の強さ）、`data/wishlist.md`（風の枠の最優先候補プール）、`data/visited.json`（過去4週の主目的地と重複禁止）、`data/plans.json`（既存週末との重複確認）。

2. **天気を取得**: Open-Meteo（無料・キー不要）で橋本駅周辺の土日予報を取る。
   ```
   https://api.open-meteo.com/v1/forecast?latitude=35.5946&longitude=139.3450&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Asia%2FTokyo
   ```
   （緯度経度は橋本駅: 35.5946, 139.3450）。取得日時を `checkedAt` に記録。

3. **案を組む**:
   - **とっておきの再提案**: 過去週末の feedback で `likes` に含まれ `went` でない案（いいね付き未実行）は、時季・天気が合えば営業・開催を再確認のうえ**本命枠で再提案してよい**。why に「以前いいねが付いた案」と書く。
   - **本命2案**: taste-profile の「好みの核＝散策×食×癒し」直球。天気適合を最優先（雨予報→映画館・スパ・大型イベント・屋内体験・動物カフェ等の屋内ローテへ）。
   - **風の枠1案**: 優先順 ①wishlist.md の未実施（☐）で時季が合うもの ②未訪問エリア ③未経験ジャンル ④その週末しかない季節もの。「なぜ新しいか」を why に書く。奇抜さは「ほどほど」（taste-profile の設定）。
   - 各案は半日〜1日、タイムライン2〜5点。詰め込まない（NGリスト: キツキツ・要予約基本NG）。
   - 過去4週と同じ主目的地は出さない（visited.json 照合）。
   - 大型イベント（ビッグサイト級）の開催日はウォッチ対象——該当週末は風の枠候補として優先検討。

4. **実在確認（必須）**: 各案の主要スポット・イベントを WebSearch/WebFetch で確認し、**開催日・営業日を確認できた公式ページ等の URL を `sources` に入れる**。確認しきれない場合は `caveats` に「要確認」と明記するか、その案を差し替える。営業時間・料金は断定しない（「調査日時点」）。

5. **plans.json に追記**: SPEC 4章のデータモデル通り。`id` は週末の土曜日付。`motif` フィールドに絵柄キーを1つ指定（yama/pan/neko/kouen/machi/yoru/onsen/umi/tenji/cafe/michi）。`meta.updated` を更新。

6. **検証と配信**: `npm run build` が通ることを確認し、commit → push（GitHub Actions が自動デプロイ）。反映は deploy-pages スキルの流儀（内容マーカー＋キャッシュバスター）で確認し、URL `https://yukikanedomi.github.io/weekend-planner/` を提示する。
