param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host $Message -ForegroundColor Cyan
}

function Write-Action {
  param([string]$Message)
  Write-Host $Message -ForegroundColor Yellow
}

function Write-Success {
  param([string]$Message)
  Write-Host $Message -ForegroundColor Green
}

function Remove-FilesByPatterns {
  param(
    [string]$Root,
    [string[]]$Patterns
  )

  if (-not (Test-Path -LiteralPath $Root)) {
    return
  }

  $excludedDirs = @(
    ".git",
    "node_modules",
    ".next"
  )

  $files = Get-ChildItem -LiteralPath $Root -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
      $fullPath = $_.FullName
      foreach ($excluded in $excludedDirs) {
        if ($fullPath -like "*\${excluded}\*") {
          return $false
        }
      }
      return $true
    } |
    Where-Object {
      $name = $_.Name
      foreach ($pattern in $Patterns) {
        if ($name -like $pattern) {
          return $true
        }
      }
      return $false
    }

  foreach ($file in $files) {
    Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Remove-PathIfExists {
  param([string]$TargetPath)
  if (Test-Path -LiteralPath $TargetPath) {
    Remove-Item -LiteralPath $TargetPath -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Step "🧹 Bắt đầu dọn dẹp log và cache..."

Write-Action "📝 Xóa file log..."
Remove-FilesByPatterns -Root $ProjectRoot -Patterns @("*.log", "debug-*.log", "*-debug.log")
Write-Success "✅ Đã xóa .log files"

Write-Action "🗑️ Xóa Next.js cache..."
Remove-PathIfExists -TargetPath (Join-Path $ProjectRoot ".next")
Write-Success "✅ Đã xóa .next folder"

Write-Action "💨 Xóa node modules cache..."
Remove-PathIfExists -TargetPath (Join-Path $ProjectRoot "node_modules\.cache")
Write-Success "✅ Đã xóa cache"

Write-Action "📦 Xóa backup files..."
Remove-FilesByPatterns -Root $ProjectRoot -Patterns @("*.bak", "*.backup", "*.old")
Write-Success "✅ Đã xóa backup files"

Write-Action "🔄 Xóa temp files..."
Remove-FilesByPatterns -Root $ProjectRoot -Patterns @("*.tmp", "*.temp", "*.swp")
Write-Success "✅ Đã xóa temp files"

Write-Action "🗂️ Xóa thư mục backup..."
Remove-PathIfExists -TargetPath (Join-Path $ProjectRoot ".cleanup-backup")
Write-Success "✅ Đã xóa .cleanup-backup"

Write-Host ""
Write-Success "✨ Dọn dẹp hoàn tất!"
Write-Success "🚀 Chạy 'npm run dev' để khởi động lại web."
