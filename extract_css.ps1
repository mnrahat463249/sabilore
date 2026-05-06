
$styleFile = "frontend\css\style.css"
$shopFile  = "frontend\css\shop.css"

$lines = Get-Content $styleFile

# 0-based line indices for each block (line numbers from file view - 1)
$b1s = 1212; $b1e = 1233   # product accordion
$b2s = 1507; $b2e = 1561   # size recommender popup
$b3s = 1771; $b3e = 1836   # tummy shape

$accordion = $lines[$b1s..$b1e]
$sizeRec   = $lines[$b2s..$b2e]
$tummy     = $lines[$b3s..$b3e]

$newLines = [System.Collections.ArrayList]::new()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if     ($i -eq $b1s)                        { [void]$newLines.Add("/* product-info-accordion moved to shop.css */") }
    elseif ($i -gt $b1s -and $i -le $b1e)       { } # skip
    elseif ($i -eq $b2s)                        { [void]$newLines.Add("/* size-recommender-popup moved to shop.css */") }
    elseif ($i -gt $b2s -and $i -le $b2e)       { } # skip
    elseif ($i -eq $b3s)                        { [void]$newLines.Add("/* tummy-shape moved to shop.css */") }
    elseif ($i -gt $b3s -and $i -le $b3e)       { } # skip
    else                                         { [void]$newLines.Add($lines[$i]) }
}

[System.IO.File]::WriteAllLines((Resolve-Path $styleFile).Path, $newLines)

$separator = "`r`n`r`n"
$append  = $separator + "/* ===== PRODUCT ACCORDION (moved from style.css) ===== */"
$append += $separator + ($accordion -join "`r`n")
$append += $separator + "/* ===== SIZE RECOMMENDER POPUP (moved from style.css) ===== */"
$append += $separator + ($sizeRec -join "`r`n")
$append += $separator + "/* ===== TUMMY SHAPE (moved from style.css) ===== */"
$append += $separator + ($tummy -join "`r`n")

Add-Content -Path $shopFile -Value $append -Encoding UTF8

$removed = $accordion.Count + $sizeRec.Count + $tummy.Count
Write-Host "Done! Removed $removed lines from style.css, appended to shop.css." -ForegroundColor Green
