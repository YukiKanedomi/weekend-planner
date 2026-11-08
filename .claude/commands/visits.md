---
description: Google マップのタイムライン（iPhone から書き出した Timeline.json）と旬レーダーの掲載を照合し、「載せた → 行った」を報告する（月 1 回目安）
---

# /visits — 載せた場所に、実際に行ったか

ふたりの滞在記録はリポジトリにも公開ページにも出さない（リポジトリは public）。照合は PC の中だけで行い、結果は git 管理外の `private/visits.json` に置く。**滞在の座標を外部サービス（地図の逆引き等）に送らない。**

## 手順
1. 本人に、iPhone の Google マップ → プロフィール → 設定 → 個人的なコンテンツ → 「タイムラインのデータをエクスポート」で、マイドライブ直下に `Timeline.json` を保存してもらう（ブラウザ版タイムラインと Takeout には訪問記録が無い。2026-11-08 確認）。
2. `node scripts/geocode-venues.mjs` で、まだ座標の無い掲載場所を OpenStreetMap で引く（会場名だけを送る。公知の情報）。出力の「← 検索語 → 当たった場所」を**目で見て**、別の街・別の店に当たったものは `data/venues-geo.json` を手で直す（`checked: "manual"`）。駅しか取れないものは precision が station になり、照合では保留される。
3. `node scripts/visits-sync.mjs`（既定でマイドライブの Timeline.json を読む）。
4. チャットに報告する: 会期中に行った新着（載せた後か前か）、行ったことのある定番と日数、判定保留の件数。新着に当たりがあれば「どの種別・橋本から何分・何曜日の提案が効いたか」を 1〜2 行で読み取り、本人に確認してから `data/taste-profile.md` の仮説欄に追記する。
   あわせて「よく行く街」（土日に 3 日以上 → いつもの街）を報告する。結果は `private/area-affinity.json` に入り、翌朝からの調査の重みと「いつもの街で」の枠に効く。表に無い場所が近場に固まっていたら `scripts/areas.mjs` に街を足す（集計は PC 内だけで、座標を外部に送らない）。
5. `node scripts/mark-usual.mjs` で feed の印を付け直す。`data/venues-geo.json` や `data/feed.json` が変わっていれば commit・push（`private/` は .gitignore 済みで入らない）。
