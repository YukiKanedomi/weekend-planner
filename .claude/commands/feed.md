---
description: 旬レーダーの新着を手動で更新する（毎朝7時の自動ジョブと同じ手順を今すぐ回す）
---

# /feed — 新着の手動更新

`scripts/daily-prompt.txt` に書かれた手順（＝毎朝 7:00 の自動ジョブ `WeekendPlanner-DailyFeed` と同じ）を、いま対話中のセッションで実行する。

- まず `scripts/daily-prompt.txt` を読み、その手順 1〜12 をそのまま行う。
- ただし手順 1 の冪等ガードは、ユーザーが「今日分をもう一度」と明示した場合は無視してよい（その場合も重複追加はしない）。
- 追加した項目は、終了後にチャットへ「件名・いつ・どこ・橋本から何分・出典」の表で全文掲載する。
- 配信 URL: https://yukikanedomi.github.io/weekend-planner/
