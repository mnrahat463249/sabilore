$file = "$PSScriptRoot\frontend\css\style.css"
$c = [System.IO.File]::ReadAllText($file)

# ── 1. Merge font-size:clamp into original html block ──
# Replace closing brace of original html block to include font-size before it
$old = "    scroll-behavior: smooth;`r`n}"
$new = "    scroll-behavior: smooth;`r`n    font-size: clamp(13px, calc(0.5rem + 1.5vw), 16px);`r`n}"
$c = $c.Replace($old, $new)

# Delete the standalone duplicate html { font-size: clamp } block + its comment
# Find and remove the block between "/* ── 1. Fluid Root Font" and closing } of html
$markerStart = "/* ── 1. Fluid Root Font"
$idx = $c.IndexOf($markerStart)
if ($idx -ge 0) {
    # find the closing } after "font-size: clamp"
    $closeIdx = $c.IndexOf("}", $idx) + 1
    # remove from marker to end of that block (include trailing newlines)
    $c = $c.Remove($idx, $closeIdx - $idx)
    Write-Host "Removed html clamp duplicate block"
} else { Write-Host "html clamp block not found" }

# ── 2. Delete the redundant "html, body { overflow-x: hidden; max-width: 100vw; }" block ──
$marker2 = "/* 2. Global overflow guard"
$idx2 = $c.IndexOf($marker2)
if ($idx2 -ge 0) {
    $closeIdx2 = $c.IndexOf("}", $idx2) + 1
    $c = $c.Remove($idx2, $closeIdx2 - $idx2)
    Write-Host "Removed overflow guard duplicate"
} else { Write-Host "overflow guard block not found" }

# ── 3. Delete redundant "html, body { max-width: 100%; overflow-x: hidden; }" in baseline section ──
# This appears right after the *::before, *::after box-sizing block
$dupHtmlBody = "html,`r`nbody {`r`n    max-width: 100%;`r`n    overflow-x: hidden;`r`n}"
$idx3 = $c.IndexOf($dupHtmlBody)
if ($idx3 -ge 0) {
    $c = $c.Remove($idx3, $dupHtmlBody.Length)
    Write-Host "Removed redundant html,body max-width block"
} else { Write-Host "html,body max-width block not found" }

# ── 4. Merge font-smoothing into original body block & delete duplicate body block ──
# Add font-smoothing to original body before its closing brace
$bodyClose = "    overflow-x: clip;`r`n}"
$bodyCloseNew = "    overflow-x: clip;`r`n    -webkit-font-smoothing: antialiased;`r`n    -moz-osx-font-smoothing: grayscale;`r`n    text-rendering: optimizeLegibility;`r`n}"
# Only replace FIRST occurrence (original body block)
$firstBodyIdx = $c.IndexOf($bodyClose)
if ($firstBodyIdx -ge 0) {
    $c = $c.Remove($firstBodyIdx, $bodyClose.Length).Insert($firstBodyIdx, $bodyCloseNew)
    Write-Host "Merged font-smoothing into original body"
}

# Delete the duplicate body { font-smoothing } block
$dupBody = "body {`r`n    -webkit-font-smoothing: antialiased;`r`n    -moz-osx-font-smoothing: grayscale;`r`n    text-rendering: optimizeLegibility;`r`n}"
$idx4 = $c.IndexOf($dupBody)
if ($idx4 -ge 0) {
    $c = $c.Remove($idx4, $dupBody.Length)
    Write-Host "Removed duplicate body block"
} else { Write-Host "duplicate body block not found" }

# ── 5. Delete duplicate .tracking-wider (in GENERAL UTILITIES section) ──
# The duplicate .tracking-wider appears between .rounded-4 and .site-header-side-col
$dupTracking = ".tracking-wider {`r`n    letter-spacing: var(--letter-spacing-wide);`r`n}`r`n`r`n.site-header-side-col {"
$dupTrackingNew = ".site-header-side-col {"
$idx5 = $c.IndexOf($dupTracking)
if ($idx5 -ge 0) {
    $c = $c.Remove($idx5, $dupTracking.Length).Insert($idx5, $dupTrackingNew)
    Write-Host "Removed duplicate .tracking-wider"
} else { Write-Host "duplicate .tracking-wider not found" }

# ── 6. Add .btn-dark:hover to original .btn-dark group (after [data-theme='dark'] .btn-dark:hover block) ──
$afterOrigBtnDark = "[data-theme='dark'] .btn-dark:hover {`r`n    background: #e9ecef;`r`n    color: #000;`r`n}"
$afterOrigBtnDarkNew = "[data-theme='dark'] .btn-dark:hover {`r`n    background: #e9ecef;`r`n    color: #000;`r`n}`r`n`r`n.btn-dark:hover {`r`n    background: #333;`r`n    border-color: #333;`r`n    transform: translateY(-1px);`r`n}"
$idx6 = $c.IndexOf($afterOrigBtnDark)
if ($idx6 -ge 0) {
    $c = $c.Remove($idx6, $afterOrigBtnDark.Length).Insert($idx6, $afterOrigBtnDarkNew)
    Write-Host "Added .btn-dark:hover to original block"
} else { Write-Host ".btn-dark:hover insertion point not found" }

# ── 7. Delete the GENERAL UTILITIES duplicate .btn-dark block ──
$dupBtnSection = "/* ==============================`r`n   GENERAL UTILITIES`r`n============================== */`r`n.btn-dark {"
$idx7 = $c.IndexOf($dupBtnSection)
if ($idx7 -ge 0) {
    # Find the end of .btn-dark:hover block (two closing braces after the marker)
    $pos = $idx7 + $dupBtnSection.Length
    # skip to end of .btn-dark {...}
    $endPos = $c.IndexOf("}", $pos) + 1
    # skip .btn-dark:hover {...}
    $startHover = $c.IndexOf(".btn-dark:hover", $endPos)
    $endHover = $c.IndexOf("}", $startHover) + 1
    
    # Replace: keep only .rounded-4 section (what comes after .btn-dark:hover)
    $c = $c.Remove($idx7, $endHover - $idx7).Insert($idx7, "`r`n/* ==============================`r`n   GENERAL UTILITIES`r`n============================== */")
    Write-Host "Removed duplicate .btn-dark from GENERAL UTILITIES"
} else { Write-Host "GENERAL UTILITIES .btn-dark not found" }

# ── 8. Delete tummy duplicate block (~lines 1875-1930) ──
# The duplicate has theme-aware background: var(--card-bg) - keep original, delete duplicate
$dupTummy = "/* ==============================`r`n   TUMMY SHAPE SELECTION`r`n============================== */`r`n.tummy-selection-container {"
$idx8 = $c.IndexOf($dupTummy)
if ($idx8 -ge 0) {
    # Remove from this comment through the .custom-radio-circle.active::after closing brace
    $endMarker = "html[data-theme='dark'] .tummy-illustration-hero {"
    $endIdx8 = $c.IndexOf($endMarker, $idx8)
    if ($endIdx8 -gt 0) {
        $c = $c.Remove($idx8, $endIdx8 - $idx8)
        Write-Host "Removed tummy duplicate block"
    }
} else { Write-Host "tummy duplicate not found" }

[System.IO.File]::WriteAllText($file, $c, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Lines: $((Get-Content $file).Count)"
