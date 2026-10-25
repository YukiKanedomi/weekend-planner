# Weekend Planner v2 "Shun Radar" - daily feed launcher (headless, subscription auth)
# Invoked by Windows Task Scheduler: WeekendPlanner-DailyFeed, daily 07:00.
# Runs `claude -p` (Opus) which researches new time-limited events / seasonal food / shopping
# within ~1h of Hashimoto station, updates data/feed.json (+ data/staples.json), builds and
# pushes (GitHub Actions deploys the page).
# - Fresh process each run = fresh context. Assets are read from data/ files.
# - Idempotent: the prompt tells claude to exit without changes if feed.json meta.updated
#   is already today (avoids double runs).
# Stop:    Disable-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed'
# Remove:  Unregister-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed' -Confirm:$false
# NOTE: keep THIS file ASCII-only. The (Japanese) prompt lives in daily-prompt.txt
#       and is read back explicitly as UTF-8 below.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$base       = 'C:\Users\kanedomi\Desktop\Claude\weekend-planner'
$log        = Join-Path $base 'scripts\daily-feed.log'
$promptFile = Join-Path $base 'scripts\daily-prompt.txt'
Set-Location $base

$prompt = Get-Content -Raw -Encoding UTF8 $promptFile

# The prompt goes in via stdin (PS 5.1 splits a native argument at a space inside embedded
# double quotes, which silently cut long prompts mid-instruction).
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') START ====" | Out-File -FilePath $log -Append -Encoding utf8
# EAP=Continue around the claude call: PS 5.1 wraps native stderr as ErrorRecords
# under 2>&1, which EAP=Stop turns fatal.
$ErrorActionPreference = 'Continue'
$prompt | & claude -p --model opus --permission-mode acceptEdits `
  --allowedTools 'WebSearch' 'WebFetch' 'Read' 'Write' 'Edit' 'Bash(node:*)' 'Bash(npm:*)' 'Bash(git:*)' 'Bash(gh:*)' 'Bash(curl:*)' 'Bash(date:*)' `
  --output-format text 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
$claudeExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') END (exit=$claudeExit) ====" | Out-File -FilePath $log -Append -Encoding utf8
