$source = "f:\RAHAT-ALL-PROGRAMING\02-projects\nodejs-projects\SABILORE PROJECT\SABILORE_LATEST\sabilore"
$dest   = "f:\RAHAT-ALL-PROGRAMING\02-projects\nodejs-projects\SABILORE PROJECT\sabilore_hostinger_deploy.zip"

if (Test-Path $dest) { Remove-Item $dest -Force }

$excludeDirs = @('node_modules', '.git', '.vscode', 'scratch', 'temp_check', 'logs', 'uploads')
$excludeFiles = @(
    'api_access.log', 'build_log.txt',
    'check_cf.js', 'check_live.js', 'check_live2.js',
    'create_deploy_zip.ps1', 'make_deploy_zip.ps1',
    'extract_css.ps1', 'fix_css_dups.ps1', 'restore_css.ps1',
    '.jscpd.json', '.markdownlint.json', '.markdownlintignore',
    '.stylelintrc.json', '.stylelintignore', '.hintrc',
    'eslint.config.js', 'jsconfig.json', 'tsconfig.json',
    'package-lock.json'
)

Add-Type -Assembly 'System.IO.Compression.FileSystem'
$zip = [System.IO.Compression.ZipFile]::Open($dest, 'Create')

$files = Get-ChildItem -Path $source -Recurse -Force | Where-Object {
    if ($_.PSIsContainer) { return $false }
    $rel   = $_.FullName.Substring($source.Length + 1)
    $parts = $rel -split '\\'
    foreach ($dir in $excludeDirs) {
        if ($parts -contains $dir) { return $false }
    }
    if ($excludeFiles -contains $_.Name) { return $false }
    return $true
}

$count = 0
foreach ($file in $files) {
    $entryName = $file.FullName.Substring($source.Length + 1)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, 'Optimal') | Out-Null
    $count++
}
$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 2)

Write-Host ""
Write-Host "=== Deployment ZIP Ready ===" -ForegroundColor Cyan
Write-Host "File : $dest" -ForegroundColor White
Write-Host "Files: $count" -ForegroundColor White
Write-Host "Size : $sizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "INCLUDED: backend/ frontend/ admin/ scripts/ schema.sql" -ForegroundColor Green
Write-Host "          package.json .env robots.txt sitemap.xml ecosystem.config.js" -ForegroundColor Green
Write-Host ""
Write-Host "EXCLUDED: node_modules/ .git/ logs/ uploads/ scratch/ temp_check/" -ForegroundColor Yellow
Write-Host "          Dev scripts, lint configs, build logs" -ForegroundColor Yellow
Write-Host ""
Write-Host "--- Hostinger Deploy Steps ---" -ForegroundColor Cyan
Write-Host "1. Upload ZIP to Hostinger file manager"
Write-Host "2. Extract to /home/u762894144/domains/sabilore.com/public_html/"
Write-Host "3. Run: npm install --omit=dev"
Write-Host "4. Start: pm2 start ecosystem.config.js"
Write-Host ""
