
# Restore the 3 CSS blocks that were removed from style.css
# Reads with UTF-8, inserts blocks, writes back UTF-8 no-BOM

$styleFile = "frontend\css\style.css"
$shopFile  = "frontend\css\shop.css"

# ─── 1. Fix style.css ──────────────────────────────────────────────
$content = [System.IO.File]::ReadAllText((Resolve-Path $styleFile).Path, [System.Text.Encoding]::UTF8)

$accordion = @"

/* ==============================
   PRODUCT ACCORDION
   ============================== */
.product-info-accordion .accordion-button {
    background: transparent;
    font-size: 0.95rem;
    padding: 16px 0;
}

.product-info-accordion .accordion-button:not(.collapsed) {
    color: var(--dark);
    box-shadow: none;
}

.product-info-accordion .accordion-button:focus {
    box-shadow: none;
}

.product-info-accordion .accordion-body {
    padding: 0 0 16px;
}
"@

$sizeRec = @"

/* ==============================
   SIZE RECOMMENDER (Minimalist Modal)
   ============================== */
.size-recommender-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -40%);
    width: 380px;
    max-width: 95%;
    background: var(--card-bg);
    color: var(--text-main);
    z-index: 10001;
    opacity: 0%;
    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    padding: 25px;
    pointer-events: none;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
}

.size-recommender-popup.active {
    opacity: 100%;
    transform: translate(-50%, -50%);
    pointer-events: auto;
}

.size-recommender-popup .form-control {
    border: none;
    border-bottom: 1px solid var(--border-color);
    border-radius: 0;
    padding: 10px 0;
    font-size: 0.9rem;
    background: transparent;
    color: var(--text-main);
}

.size-recommender-popup .form-control:focus {
    box-shadow: none;
    border-bottom: 1px solid var(--primary);
}

.size-recommender-popup label {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--secondary);
}
"@

$tummy = @"

/* ==============================
   TUMMY SHAPE SELECTION
   ============================== */
.tummy-selection-container {
    padding: 30px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    margin-bottom: 25px;
    position: relative;
    z-index: 10;
}

.tummy-illustration-hero {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fdfdfd;
    margin-bottom: 25px;
    border-radius: 4px;
}

.tummy-radio-group {
    display: flex;
    justify-content: space-between;
    max-width: 300px;
    margin: 0 auto 20px;
}

.tummy-radio-opt {
    cursor: pointer;
    text-align: center;
    transition: opacity 0.2s;
}

.tummy-radio-opt:hover {
    opacity: 80%;
}

.custom-radio-circle {
    width: 24px;
    height: 24px;
    border-radius: 50% !important;
    border: 1px solid #ccc;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
    background: #fff;
}

.custom-radio-circle.active::after {
    content: '';
    position: absolute;
    inset: 6px;
    background: var(--text-main);
    border-radius: 50%;
}

html[data-theme='dark'] .tummy-illustration-hero {
    background: #1a1a1a;
}
"@

# Insert blocks after placeholder comments
$content = $content -replace '\/\* product-info-accordion moved to shop\.css \*\/', "/* product-info-accordion */$accordion"
$content = $content -replace '\/\* size-recommender-popup moved to shop\.css \*\/', "/* size-recommender-popup */$sizeRec"
$content = $content -replace '\/\* tummy-shape moved to shop\.css \*\/', "/* tummy-shape */$tummy"

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $styleFile).Path, $content, $utf8NoBom)
Write-Host "style.css restored successfully." -ForegroundColor Green

# ─── 2. Fix shop.css — remove the appended blocks ──────────────────
$shopContent = [System.IO.File]::ReadAllText((Resolve-Path $shopFile).Path, [System.Text.Encoding]::UTF8)

# Remove everything after the original shop.css content (the appended section)
$cutMarker = "`r`n`r`n/* ===== PRODUCT ACCORDION (moved from style.css) ====="
$altMarker = "`n`n/* ===== PRODUCT ACCORDION (moved from style.css) ====="

if ($shopContent.Contains($cutMarker)) {
    $shopContent = $shopContent.Substring(0, $shopContent.IndexOf($cutMarker))
} elseif ($shopContent.Contains($altMarker)) {
    $shopContent = $shopContent.Substring(0, $shopContent.IndexOf($altMarker))
}

[System.IO.File]::WriteAllText((Resolve-Path $shopFile).Path, $shopContent, $utf8NoBom)
Write-Host "shop.css cleaned up." -ForegroundColor Green

Write-Host "Done. Now run: node scripts/minify-assets.js" -ForegroundColor Cyan
