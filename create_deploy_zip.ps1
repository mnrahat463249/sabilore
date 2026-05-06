# ============================================================
# SABILORE - Hostinger Deployment ZIP Creator
# ============================================================
# This script copies only production-needed files to a temp
# folder and zips them, ready for Hostinger upload.
# ============================================================

$root      = $PSScriptRoot
$zipName   = "SABILORE_FINAL_CSS.zip"
$tempDir   = Join-Path $env:TEMP "sabilore_deploy_temp"
$outputZip = Join-Path $root $zipName

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SABILORE - Hostinger Deployment Builder  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Clean up previous temp ----------
if (Test-Path $tempDir) {
    Write-Host "[1/6] Removing old temp folder..." -ForegroundColor Yellow
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null
Write-Host "[1/6] Temp folder created: $tempDir" -ForegroundColor Green

# ---------- Folders to INCLUDE ----------
$includeFolders = @(
    "backend",
    "frontend",
    "admin",
    "uploads",
    "scripts"          # minify-assets, optimize-images needed on server
)

# ---------- Root files to INCLUDE ----------
$includeFiles = @(
    ".env",
    "package.json",
    "package-lock.json",
    "ecosystem.config.js",
    "robots.txt",
    "sitemap.xml",
    "schema.sql"
)

# ---------- Sub-paths inside backend to EXCLUDE (dev/debug scripts) ----------
$excludeBackendFiles = @(
    "backend\clean_db.js",
    "backend\fix_orphan_tablespace.js",
    "backend\generate_token.js",
    "backend\test_cache.js",
    "backend\seed-colors.js",
    "backend\process.exit())"  # stray file
)

# ---------- Scripts folder: keep only essential scripts ----------
$keepScripts = @(
    "minify-assets.js",
    "optimize-images.js",
    "version.json"
)

# ---------- Copy folders ----------
Write-Host ""
Write-Host "[2/6] Copying production folders..." -ForegroundColor Yellow

foreach ($folder in $includeFolders) {
    $src  = Join-Path $root $folder
    $dest = Join-Path $tempDir $folder

    if (-not (Test-Path $src)) {
        Write-Host "  SKIPPED (not found): $folder" -ForegroundColor DarkGray
        continue
    }

    if ($folder -eq "scripts") {
        # Only copy selected scripts
        New-Item -ItemType Directory -Path $dest | Out-Null
        foreach ($s in $keepScripts) {
            $sf = Join-Path $src $s
            if (Test-Path $sf) {
                Copy-Item $sf $dest
                Write-Host "  Copied script: $s" -ForegroundColor Green
            }
        }
    } else {
        Copy-Item $src $dest -Recurse
        Write-Host "  Copied: $folder" -ForegroundColor Green
    }
}

# ---------- Remove excluded backend dev files ----------
Write-Host ""
Write-Host "[3/6] Removing dev-only backend files..." -ForegroundColor Yellow
foreach ($f in $excludeBackendFiles) {
    $target = Join-Path $tempDir $f
    if (Test-Path $target) {
        Remove-Item $target -Force
        Write-Host "  Deleted: $f" -ForegroundColor Red
    }
}

# Remove backend\scripts folder entirely (those are local-only dev scripts)
$backendScripts = Join-Path $tempDir "backend\scripts"
if (Test-Path $backendScripts) {
    Remove-Item $backendScripts -Recurse -Force
    Write-Host "  Deleted: backend\scripts (dev tools)" -ForegroundColor Red
}

# Remove admin python scripts
$adminPy = Join-Path $tempDir "admin\add_coupons.py"
if (Test-Path $adminPy) {
    Remove-Item $adminPy -Force
    Write-Host "  Deleted: admin\add_coupons.py" -ForegroundColor Red
}

# ---------- Copy root files ----------
Write-Host ""
Write-Host "[4/6] Copying root config files..." -ForegroundColor Yellow
foreach ($f in $includeFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src $tempDir
        Write-Host "  Copied: $f" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $f" -ForegroundColor DarkRed
    }
}

# ---------- Remove node_modules from temp (should not exist, but safety check) ----------
$nm = Join-Path $tempDir "node_modules"
if (Test-Path $nm) {
    Write-Host ""
    Write-Host "[5/6] Removing node_modules from temp..." -ForegroundColor Yellow
    Remove-Item $nm -Recurse -Force
    Write-Host "  node_modules removed." -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "[5/6] node_modules not in temp (good)." -ForegroundColor Green
}

# ---------- Create ZIP ----------
Write-Host ""
Write-Host "[6/6] Creating ZIP file: $zipName ..." -ForegroundColor Yellow

if (Test-Path $outputZip) {
    Remove-Item $outputZip -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputZip)

# ---------- Show result ----------
$zipInfo = Get-Item $outputZip
$sizeMB  = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DONE! Deployment ZIP created." -ForegroundColor Green
Write-Host "  File : $outputZip" -ForegroundColor White
Write-Host "  Size : $sizeMB MB" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps for Hostinger:" -ForegroundColor Yellow
Write-Host "  1. Upload SABILORE_FINAL_CSS.zip to File Manager" -ForegroundColor White
Write-Host "  2. Extract it in the root of your Node.js app directory" -ForegroundColor White
Write-Host "  3. Run 'npm install --omit=dev' via SSH or Hostinger terminal" -ForegroundColor White
Write-Host "  4. Start with PM2: 'pm2 start ecosystem.config.js'" -ForegroundColor White
Write-Host "  5. Import schema.sql into Hostinger MySQL using phpMyAdmin" -ForegroundColor White
Write-Host ""

# Cleanup temp
Remove-Item $tempDir -Recurse -Force
Write-Host "Temp folder cleaned up." -ForegroundColor DarkGray
Write-Host ""
