#!/bin/sh
# Builds the two copies of Ivory Reader from src/.
#   index.html            installable PWA, served by GitHub Pages
#   $1 (optional)         the claude.ai artifact copy, which can scan photos
# Both share src/head.html, src/body.html and src/script.html; only the font
# source and the PWA wiring differ.
set -e
cd "$(dirname "$0")"
ART="${1:-dist/artifact.html}"

PWA_HEAD='<link rel="stylesheet" href="./fonts/fonts.css">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Ivory">
<meta name="application-name" content="Ivory Reader">
<meta name="theme-color" content="#F5F2EB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15130F" media="(prefers-color-scheme: dark)">'

CDN_HEAD='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600&family=Noto+Music&display=swap">'

sub_fonts() { awk -v repl="$1" '{ if ($0 == "<!--FONTS-->") print repl; else print }' src/head.html; }

# --- PWA build ---
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  printf '<meta name="mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
  sub_fonts "$PWA_HEAD"
  printf '</head>\n<body>\n'
  cat src/body.html src/script.html
  cat <<'SW'
<script>
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  });
}
</script>
SW
  printf '</body>\n</html>\n'
} > index.html

# --- artifact build (no doctype/head/body: the Artifact tool supplies them) ---
mkdir -p "$(dirname "$ART")"
{
  sub_fonts "$CDN_HEAD"
  cat src/body.html src/script.html
} > "$ART"

echo "built index.html ($(wc -c < index.html) bytes) and $ART ($(wc -c < "$ART") bytes)"
