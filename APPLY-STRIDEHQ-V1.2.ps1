param(
  [string]$Target = "C:\work\GitProject\project-112"
)

$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceResolved = (Resolve-Path $Source).Path.TrimEnd('\')
$targetResolved = if (Test-Path $Target) { (Resolve-Path $Target).Path.TrimEnd('\') } else { $Target.TrimEnd('\') }

if ($sourceResolved -eq $targetResolved) {
  Write-Host "Patch liegt bereits direkt im Zielordner. Es muss nichts kopiert werden." -ForegroundColor Yellow
  exit 0
}

if (-not (Test-Path $Target)) {
  throw "Zielordner nicht gefunden: $Target"
}

$entries = @("project112-app", "supabase")
foreach ($entry in $entries) {
  $sourcePath = Join-Path $Source $entry
  if (Test-Path $sourcePath) {
    Copy-Item $sourcePath $Target -Recurse -Force
  }
}

Write-Host "StrideHQ v1.2 wurde nach $Target kopiert." -ForegroundColor Green
Write-Host "Weiter mit: cd $Target\project112-app; npm run lint; npm run build; npm run dev"
