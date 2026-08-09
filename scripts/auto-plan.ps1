# Weekend Planner - Friday auto-plan launcher (headless, subscription auth)
# Invoked by Windows Task Scheduler: WeekendPlanner-FridayPlan, weekly Friday 17:00.
# Runs `claude -p` which generates this weekend's 3 plans (SPEC rules), appends to
# data/plans.json, builds and pushes (GitHub Actions deploys the page).
# - Fresh process each run = fresh context. Assets are read from data/ files.
# - Idempotent: the prompt tells claude to exit without changes if this weekend's
#   id already exists in plans.json (avoids double delivery with manual runs).
# Stop:  Unregister-ScheduledTask -TaskName 'WeekendPlanner-FridayPlan' -Confirm:$false
# NOTE: keep THIS file ASCII-only. The (Japanese) prompt lives in plan-prompt.txt
#       and is read back explicitly as UTF-8 below.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$base       = 'C:\Users\kanedomi\Desktop\Claude\weekend-planner'
$log        = Join-Path $base 'scripts\auto-plan.log'
$promptFile = Join-Path $base 'scripts\plan-prompt.txt'
Set-Location $base

$prompt = Get-Content -Raw -Encoding UTF8 $promptFile

"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') START ====" | Out-File -FilePath $log -Append -Encoding utf8
# EAP=Continue around the claude call: PS 5.1 wraps native stderr as ErrorRecords
# under 2>&1, which EAP=Stop turns fatal. $null| closes stdin (skips the 3s wait).
$ErrorActionPreference = 'Continue'
$null | & claude -p $prompt --model sonnet --permission-mode acceptEdits `
  --allowedTools 'WebSearch' 'WebFetch' 'Read' 'Bash(node:*)' 'Bash(npm:*)' 'Bash(git:*)' 'Bash(gh:*)' 'Bash(curl:*)' `
  --output-format text 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
$claudeExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') END (exit=$claudeExit) ====" | Out-File -FilePath $log -Append -Encoding utf8
