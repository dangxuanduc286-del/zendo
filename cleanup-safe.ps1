[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [string]$Root = ".",
    [switch]$Delete,
    [switch]$IncludeNextCache,
    [string]$BackupRoot = ".cleanup-backup",
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath((Resolve-Path -Path $Path).Path)
}

function New-BackupPath {
    param(
        [Parameter(Mandatory = $true)][string]$ItemPath,
        [Parameter(Mandatory = $true)][string]$RootPath,
        [Parameter(Mandatory = $true)][string]$BackupBase
    )
    $relative = [System.IO.Path]::GetRelativePath($RootPath, $ItemPath)
    return Join-Path -Path $BackupBase -ChildPath $relative
}

function Test-ProtectedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $segments = $Path -split "[\\/]+" | Where-Object { $_ -ne "" }
    $protected = @("node_modules", ".git", ".env", ".env.local", ".env.production", ".env.development")
    foreach ($segment in $segments) {
        if ($protected -contains $segment) {
            return $true
        }
    }
    return $false
}

function Get-CleanupCandidates {
    param(
        [Parameter(Mandatory = $true)][string]$RootPath,
        [switch]$IncludeNext
    )

    $patterns = @("*.log", "debug-*.log", "*.tmp", "*.temp", "*.bak")
    $found = New-Object System.Collections.Generic.List[System.IO.FileSystemInfo]

    foreach ($pattern in $patterns) {
        $items = Get-ChildItem -Path $RootPath -Recurse -File -Force -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            if (-not (Test-ProtectedPath -Path $item.FullName)) {
                $found.Add($item)
            }
        }
    }

    if ($IncludeNext) {
        $nextPath = Join-Path -Path $RootPath -ChildPath ".next"
        if (Test-Path -Path $nextPath -PathType Container) {
            $nextDir = Get-Item -LiteralPath $nextPath
            if (-not (Test-ProtectedPath -Path $nextDir.FullName)) {
                $found.Add($nextDir)
            }
        }
    }

    return $found | Sort-Object FullName -Unique
}

$rootPath = Resolve-NormalizedPath -Path $Root
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBase = Join-Path -Path (Resolve-Path ".").Path -ChildPath "$BackupRoot\$timestamp"

Write-Host "Scanning cleanup candidates under: $rootPath" -ForegroundColor Cyan
$candidates = Get-CleanupCandidates -RootPath $rootPath -IncludeNext:$IncludeNextCache

if ($candidates.Count -eq 0) {
    Write-Host "No cleanup candidates found." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Candidates (NOT deleted):" -ForegroundColor Yellow
$candidates | ForEach-Object { Write-Host " - $($_.FullName)" }
Write-Host ""

if (-not $Delete) {
    Write-Host "Dry-run mode complete. Use -Delete to proceed with backup + deletion." -ForegroundColor Green
    Write-Host "Example: .\cleanup-safe.ps1 -Root . -IncludeNextCache -Delete -WhatIf"
    exit 0
}

if (-not $Force) {
    $answer = Read-Host "Type YES to backup and delete the listed items"
    if ($answer -ne "YES") {
        Write-Host "Cancelled. No files were deleted." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Backup directory: $backupBase" -ForegroundColor Cyan
New-Item -Path $backupBase -ItemType Directory -Force | Out-Null

foreach ($item in $candidates) {
    $backupPath = New-BackupPath -ItemPath $item.FullName -RootPath $rootPath -BackupBase $backupBase
    $backupDir = Split-Path -Path $backupPath -Parent
    New-Item -Path $backupDir -ItemType Directory -Force | Out-Null

    if ($item.PSIsContainer) {
        if ($PSCmdlet.ShouldProcess($item.FullName, "Backup directory")) {
            Copy-Item -LiteralPath $item.FullName -Destination $backupPath -Recurse -Force
        }
        if ($PSCmdlet.ShouldProcess($item.FullName, "Remove directory")) {
            Remove-Item -LiteralPath $item.FullName -Recurse -Force
        }
    }
    else {
        if ($PSCmdlet.ShouldProcess($item.FullName, "Backup file")) {
            Copy-Item -LiteralPath $item.FullName -Destination $backupPath -Force
        }
        if ($PSCmdlet.ShouldProcess($item.FullName, "Remove file")) {
            Remove-Item -LiteralPath $item.FullName -Force
        }
    }
}

Write-Host "Completed. Backups are in: $backupBase" -ForegroundColor Green
