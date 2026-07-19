param(
  [string]$RepoPath = "C:\work\GitProject\project-112"
)

$ErrorActionPreference = "Stop"
Set-Location $RepoPath

Write-Host "Entferne generierte Dateien und lokale Konfiguration aus der Git-Verfolgung ..." -ForegroundColor Cyan

git rm -r --cached --ignore-unmatch project112-app/node_modules stridehq-server/node_modules project112-app/dist
git rm --cached --ignore-unmatch project112-app/.env stridehq-server/.env

Remove-Item ".git\.MERGE_MSG.swp" -Force -ErrorAction SilentlyContinue
Remove-Item "project112-app\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

git add .gitignore project112-app/.gitignore

Write-Host "Bereinigung vorbereitet. Prüfe jetzt mit: git status" -ForegroundColor Green
Write-Host "Die lokalen .env-Dateien und node_modules bleiben auf dem Rechner erhalten, werden aber nicht mehr committed." -ForegroundColor Yellow
