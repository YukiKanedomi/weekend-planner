# Weekend Planner v2 "Shun Radar" - daily feed launcher (headless, subscription auth)
# Invoked by Windows Task Scheduler: WeekendPlanner-DailyFeed, daily 07:00
# (registered with restart-on-failure: up to 4 retries every 90 min, so an expired
#  OAuth session or a transient push failure gets another chance the same day).
#
# Stages:
#   1. claude -p (Opus) researches new items and edits data/feed.json / data/staples.json.
#   2. FINALIZE (deterministic, no LLM): validate data -> commit data/ if changed ->
#      push with retries. If validation fails, data/ is restored (git checkout) and the
#      run exits non-zero. This stage runs even if claude already committed/pushed, so
#      delivery never depends on the model following the push instructions.
#
# Exit codes: 0 ok / 2 auth failure (claude could not authenticate) / 3 claude failed /
#             4 validation failed (data restored) / 5 push failed (commit kept locally)
# Stop:    Disable-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed'
# Remove:  Unregister-ScheduledTask -TaskName 'WeekendPlanner-DailyFeed' -Confirm:$false
# NOTE: keep THIS file ASCII-only. The (Japanese) prompt lives in daily-prompt.txt
#       and is read back explicitly as UTF-8 below.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

$base       = 'C:\Users\kanedomi\Desktop\Claude\weekend-planner'
$log        = Join-Path $base 'scripts\daily-feed.log'
$promptFile = Join-Path $base 'scripts\daily-prompt.txt'
Set-Location $base

function Log($msg) { "$(Get-Date -Format 'HH:mm:ss') $msg" | Out-File -FilePath $log -Append -Encoding utf8 }
function Run($exe, [string[]]$argv) {
  # run a native command with EAP=Continue (PS 5.1 turns stderr into ErrorRecords under Stop)
  $ErrorActionPreference = 'Continue'
  $out = & $exe @argv 2>&1 | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  return @{ code = $code; out = $out }
}

"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') START ====" | Out-File -FilePath $log -Append -Encoding utf8
$today = Get-Date -Format 'yyyy-MM-dd'

# ---------- Stage 1: claude ----------
$prompt = Get-Content -Raw -Encoding UTF8 $promptFile
$ErrorActionPreference = 'Continue'
$claudeOut = $prompt | & claude -p --model opus --permission-mode acceptEdits `
  --allowedTools 'WebSearch' 'WebFetch' 'Read' 'Write' 'Edit' 'Bash(node:*)' 'Bash(npm:*)' 'Bash(git:*)' 'Bash(gh:*)' 'Bash(curl:*)' 'Bash(date:*)' `
  --output-format text 2>&1 | Out-String
$claudeExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
$claudeOut | Out-File -FilePath $log -Append -Encoding utf8
Log "claude exit=$claudeExit"

$exitCode = 0
if ($claudeOut -match 'Failed to authenticate|OAuth session expired|not logged in') {
  Log "AUTH FAILURE detected -> exit 2 (Task Scheduler will retry)"
  $exitCode = 2
} elseif ($claudeExit -ne 0) {
  Log "claude failed (exit=$claudeExit) -> will still try to finalize whatever is valid"
  $exitCode = 3
}

# ---------- Stage 2: FINALIZE (deterministic) ----------
# 2a. validate; on failure restore data/ and stop
$v = Run 'node' @('scripts/validate-data.mjs')
if ($v.code -ne 0) {
  Log "validate FAILED:`n$($v.out)"
  $r = Run 'git' @('checkout', '--', 'data/')
  Log "data/ restored (git checkout): exit=$($r.code)"
  "==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') END (exit=4) ====" | Out-File -FilePath $log -Append -Encoding utf8
  exit 4
}
Log "validate OK"

# 2b. commit data/ if claude left changes uncommitted
$dirty = (Run 'git' @('status', '--porcelain', '--', 'data/')).out.Trim()
if ($dirty) {
  $r = Run 'git' @('add', '--', 'data/')
  $r = Run 'git' @('commit', '-m', "feed: $today auto update (finalized by launcher)")
  Log "committed leftover data/ changes: exit=$($r.code) $($r.out.Trim())"
}

# 2c. push unpushed commits with retries (pull --ff-only first; rebase if needed)
$r = Run 'git' @('fetch', 'origin', 'main')
$ahead = (Run 'git' @('rev-list', '--count', 'origin/main..main')).out.Trim()
if ($ahead -and [int]$ahead -gt 0) {
  Log "unpushed commits: $ahead -> pushing"
  $pushed = $false
  for ($i = 1; $i -le 4; $i++) {
    $r = Run 'git' @('pull', '--rebase', 'origin', 'main')
    if ($r.code -ne 0) { Log "pull --rebase failed (try $i): $($r.out.Trim())"; $null = Run 'git' @('rebase', '--abort') }
    $p = Run 'git' @('push', 'origin', 'main')
    if ($p.code -eq 0) { $pushed = $true; Log "push OK (try $i)"; break }
    Log "push failed (try $i): $($p.out.Trim())"
    Start-Sleep -Seconds (30 * $i)
  }
  if (-not $pushed) { Log "PUSH FAILED after retries (commit kept locally; next run will push it)"; if ($exitCode -eq 0) { $exitCode = 5 } }
} else {
  Log "nothing to push"
}

"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') END (exit=$exitCode) ====" | Out-File -FilePath $log -Append -Encoding utf8
exit $exitCode
