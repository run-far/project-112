param(
  [string]$RepoPath = "C:\work\GitProject\project-112"
)

$ErrorActionPreference = "Stop"
$source = $PSScriptRoot

if (-not (Test-Path (Join-Path $RepoPath "project112-app\package.json"))) {
  throw "StrideHQ-Repository nicht gefunden: $RepoPath"
}

Write-Host "StrideHQ v1.1 wird nach $RepoPath kopiert ..." -ForegroundColor Cyan

Copy-Item (Join-Path $source ".gitignore") (Join-Path $RepoPath ".gitignore") -Force
Copy-Item (Join-Path $source ".github") $RepoPath -Recurse -Force
Copy-Item (Join-Path $source "project112-app") $RepoPath -Recurse -Force
Copy-Item (Join-Path $source "supabase") $RepoPath -Recurse -Force

Remove-Item (Join-Path $RepoPath "project112-app\node_modules\.vite") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Patch angewendet." -ForegroundColor Green
Write-Host "Danach ausführen:" -ForegroundColor Yellow
Write-Host "  cd $RepoPath\project112-app"
Write-Host "  npm run dev"
