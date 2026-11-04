# ============================================================
# OPAC Demo - Stop
# ============================================================
# Menghentikan server Next.js dan tunnel Cloudflare yang dijalankan
# oleh start-demo.ps1.
#
# Pemakaian:
#   powershell -ExecutionPolicy Bypass -File stop-demo.ps1
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

Write-Host ''
Write-Host 'Menghentikan demo OPAC...' -ForegroundColor Yellow

$nodes = Get-Process node -ErrorAction SilentlyContinue
if ($nodes) {
    $nodes | Stop-Process -Force
    Write-Host "  Server Next.js dihentikan ($($nodes.Count) proses)." -ForegroundColor Gray
} else {
    Write-Host '  Server Next.js: tidak ada proses berjalan.' -ForegroundColor DarkGray
}

$tunnels = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($tunnels) {
    $tunnels | Stop-Process -Force
    Write-Host "  Tunnel Cloudflare dihentikan." -ForegroundColor Gray
} else {
    Write-Host '  Tunnel Cloudflare: tidak ada proses berjalan.' -ForegroundColor DarkGray
}

$urlFile = Join-Path $env:LOCALAPPDATA 'opac-demo\public-url.txt'
if (Test-Path $urlFile) {
    $url = (Get-Content $urlFile -Raw).Trim()
    Write-Host ''
    Write-Host "  URL yang tadi aktif (kini mati): $url" -ForegroundColor DarkGray
    Remove-Item $urlFile -Force
}

Write-Host ''
Write-Host 'Semua dihentikan.' -ForegroundColor Green
Write-Host ''
Read-Host 'Tekan Enter untuk menutup jendela ini'
