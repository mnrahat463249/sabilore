/**
 * fix-css-dedup-v2.js
 * 
 * Removes duplicate CSS rules from style.css by line ranges.
 * These ranges were identified by manually comparing style.css vs critical.css.
 * After removal, rebuilds style.min.css and critical.min.css.
 * 
 * SAFE: only touches style.css and the two .min.css files.
 * HTML files are NOT modified.
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

const ROOT      = path.join(__dirname, '..');
const CSS_DIR   = path.join(ROOT, 'frontend', 'css');
const STYLE_SRC = path.join(CSS_DIR, 'style.css');
const STYLE_MIN = path.join(CSS_DIR, 'style.min.css');
const CRIT_SRC  = path.join(CSS_DIR, 'critical.css');
const CRIT_MIN  = path.join(CSS_DIR, 'critical.min.css');

// ─── Read style.css as lines ─────────────────────────────────────────────────
const lines = fs.readFileSync(STYLE_SRC, 'utf8').split(/\r?\n/);
console.log(`📄 style.css: ${lines.length} lines, ${(fs.statSync(STYLE_SRC).size / 1024).toFixed(1)} KB`);

/**
 * Line ranges to DELETE from style.css (1-indexed, inclusive).
 * These are blocks that duplicate what critical.css already defines.
 * 
 * Identified from reading both files:
 * - critical.css inlines: reset, :root vars, body, skeleton-loader, logo-ticker, 
 *   hero-section basics, logo-shine-wrapper, nike-cta/size buttons
 */
const rangestoDelete = [
  // ── :root & shadow vars duplicate (lines 1-5) ──
  [1, 5],

  // ── universal reset * { margin/padding/box-sizing } (lines 29-33) ──
  // (critical.css lines 5-8 already define * { padding:0; box-sizing:border-box; })
  [29, 33],

  // ── body, html { overflow-x:hidden } (lines 34-38) ──
  // critical.css lines 9-16 already define this
  [34, 38],

  // ── body { opacity:0%; font; transition } duplicate (lines 40-55) ──
  // critical.css lines 40-51 already define this
  [40, 55],

  // ── .skeleton-loader duplicate (lines 127-133) ──
  // critical.css lines 52-66 already define this + keyframes
  [127, 133],

  // ── html[data-theme=dark] .skeleton-loader (lines 134-136) ──
  // Only in style.css — KEEP this (dark theme variant not in critical.css)
  // So skip this range.

  // ── @keyframes skeleton-loading duplicate (lines 137-144) ──
  [137, 144],

  // ── .logo-shine-wrapper + hover + ::after + @keyframes pulseGlow (lines 357-396) ──
  // critical.css lines 124-147 already cover logo-shine-wrapper basics
  // BUT style.css has richer version (.logo-shine-wrapper::after with pulseGlow)
  // which critical.css does NOT have → KEEP in style.css
  // So we only remove the minimal .logo-shine-wrapper{} if it exactly duplicates:
  // critical.css line 124: .logo-shine-wrapper { position:relative; display:flex; align-items:center; min-height:48px }
  // style.css line 357-363: .logo-shine-wrapper { position:relative; display:inline-flex; align-items:center; overflow:hidden; padding:4px; perspective:1000px; }
  // Different! → KEEP style.css version (it's richer). DO NOT remove.

  // ── .main-site-navbar duplicate (lines 397-402) ──
  // critical.css lines 85-93 define this with more complete values
  // style.css lines 397-402: slightly different (padding:5px vs 2px, transition added)
  // These conflict — critical.css is inlined first, style.css loaded async.
  // The style.css version wins (loaded after). This is intentional → KEEP.

  // ── .logo-ticker-bar full block (lines 1603-1619) ──
  // critical.css lines 67-84 define .logo-ticker-bar with #000 background
  // style.css lines 1603-1619 redefine with #1a1a1a — DIFFERENT → KEEP
  // But it's still a "duplicate" selector. We'll keep the style.css version
  // since it loads after and will win. OK to keep.

  // ── .logo-ticker-track (lines 1621-1628) ──
  // critical.css line 99-102 define this identically → REMOVE duplicate
  [1621, 1628],

  // ── .logo-ticker-item (lines 1629-1638) ──
  // critical.css lines 104-115 define this identically → REMOVE duplicate
  [1629, 1638],

  // ── @keyframes logoTickerScroll (lines 1648-1655) ──
  // critical.css lines 116-123 define this identically → REMOVE duplicate
  [1648, 1655],

  // ── .nike-cta-primary, .nike-cta-secondary full block (lines 2566-2673) ──
  // critical.css lines 209-319 define ALL of these identically → REMOVE ALL
  [2566, 2673],
];

// ─── Mark lines for deletion (0-indexed internally) ──────────────────────────
const toDelete = new Set();
for (const [start, end] of rangestoDelete) {
  for (let i = start - 1; i <= end - 1; i++) {
    toDelete.add(i);
  }
}

// ─── Build cleaned content ────────────────────────────────────────────────────
const cleanedLines = lines.filter((_, idx) => !toDelete.has(idx));
const cleanedCss   = cleanedLines.join('\n');

console.log(`📝 Lines removed: ${toDelete.size}`);
console.log(`📝 Remaining lines: ${cleanedLines.length}`);

// ─── Write cleaned style.css ──────────────────────────────────────────────────
fs.writeFileSync(STYLE_SRC, cleanedCss, 'utf8');
console.log(`✅ style.css written: ${(cleanedCss.length / 1024).toFixed(1)} KB`);

// ─── Minify helper ────────────────────────────────────────────────────────────
function minify(src) {
  const result = new CleanCSS({
    level: { 1: { all: true }, 2: { all: true } },
    returnPromise: false,
  }).minify(src);
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.join(', '));
  }
  return result.styles;
}

// ─── Minify style.css → style.min.css ─────────────────────────────────────────
try {
  const styleMin = minify(cleanedCss);
  fs.writeFileSync(STYLE_MIN, styleMin, 'utf8');
  console.log(`✅ style.min.css: ${(styleMin.length / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error('❌ style.css minification failed:', e.message);
}

// ─── Minify critical.css → critical.min.css ───────────────────────────────────
try {
  const critSrc = fs.readFileSync(CRIT_SRC, 'utf8');
  const critMin = minify(critSrc);
  fs.writeFileSync(CRIT_MIN, critMin, 'utf8');
  console.log(`✅ critical.min.css: ${(critMin.length / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error('❌ critical.css minification failed:', e.message);
}

console.log('\n🎉 CSS deduplication complete!');
console.log('   ℹ️  style.css was cleaned of duplicate rules.');
console.log('   ℹ️  HTML files were NOT modified.');
console.log('   ℹ️  Restart the server to apply changes.');
