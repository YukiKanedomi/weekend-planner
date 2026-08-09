# Generate per-plan cheki images via Codex CLI (gpt-image-2), then resize to 512px JPEG.
# Input:  scripts/image-briefs.json  [{ "id": "2026-08-15-a", "prompt": "<english scene>" }, ...]
# Output: public/motifs/weekly/<id>.jpg (one per successful generation)
# Called by the Friday headless job (and manual /plan). Failures are logged and skipped:
# the app falls back to the motif library image, so delivery never blocks on images.
# NOTE: keep this file ASCII-only (PS 5.1). Style prefix is fixed here so weekly prompts
# only describe the scene; the art style never drifts.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$base   = 'C:\Users\kanedomi\Desktop\Claude\weekend-planner'
$briefs = Join-Path $base 'scripts\image-briefs.json'
$outDir = Join-Path $base 'public\motifs\weekly'
$tmpDir = Join-Path $base 'scripts\imggen-tmp'
$style  = 'mid-century Scandinavian picture book style, flat gouache shapes, soft paper texture, muted teal mustard brick and cream palette, no people, no readable text anywhere'

if (-not (Test-Path $briefs)) { Write-Output 'NO_BRIEFS'; exit 0 }
$items = (Get-Content -Raw -Encoding UTF8 $briefs | ConvertFrom-Json)
New-Item -ItemType Directory -Force $outDir | Out-Null
New-Item -ItemType Directory -Force $tmpDir | Out-Null

Add-Type -AssemblyName System.Drawing
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep  = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

$ok = @(); $ng = @()
foreach ($it in $items) {
  $id = $it.id; $png = Join-Path $tmpDir ($id + '.png')
  if (Test-Path $png) { Remove-Item $png -Force }
  $prompt = 'Use the image generation tool to generate an image: ' + $it.prompt + '. Art style: ' + $style + '. Minor stylistic imperfection is acceptable; do not spend extra turns correcting small issues. Save it as ./' + $id + '.png'
  $c = 'codex exec -C ' + $tmpDir + ' -s workspace-write --skip-git-repo-check "' + $prompt + '" < NUL > ' + $tmpDir + '\' + $id + '.log 2>&1'
  $ErrorActionPreference = 'Continue'
  cmd /c $c
  $ErrorActionPreference = 'Stop'
  if (Test-Path $png) {
    $img = [System.Drawing.Image]::FromFile($png)
    $w = 512; $h = [int]($img.Height * $w / $img.Width)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save((Join-Path $outDir ($id + '.jpg')), $enc, $ep)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    $ok += $id
  } else {
    $ng += $id
  }
}
Write-Output ('OK: '  + ($ok -join ','))
Write-Output ('NG: '  + ($ng -join ','))
