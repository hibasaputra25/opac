# ============================================================
# OPAC Demo Launcher - Perpustakaan Universitas Mercu Buana
# ============================================================
# Menjalankan aplikasi (server produksi Next.js) + tunnel publik
# Cloudflare dalam satu perintah, lalu menampilkan URL publik
# yang bisa dibagikan ke atasan.
#
# Pemakaian:
#   Klik kanan file ini di Explorer -> "Run with PowerShell"
#   atau dari terminal:  powershell -ExecutionPolicy Bypass -File start-demo.ps1
#
# Untuk menghentikan semuanya:  powershell -ExecutionPolicy Bypass -File stop-demo.ps1
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

$ProjectDir = 'C:\opac'
$CloudflaredDir = Join-Path $env:LOCALAPPDATA 'cloudflared'
$LogDir = Join-Path $env:LOCALAPPDATA 'opac-demo'
$TunnelLog = Join-Path $LogDir 'tunnel-err.log'
$TunnelOut = Join-Path $LogDir 'tunnel-out.log'
$ServerLog = Join-Path $LogDir 'server.log'
$UrlFile = Join-Path $LogDir 'public-url.txt'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host '   OPAC Demo Launcher' -ForegroundColor Cyan
Write-Host '   Perpustakaan Universitas Mercu Buana' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''

# ---------- [1/4] Bersihkan proses lama ----------
Write-Host '[1/4] Membersihkan proses lama...' -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host '      selesai.' -ForegroundColor Gray

# ---------- [2/4] Mulai server produksi ----------
Write-Host '[2/4] Menjalankan server produksi Next.js...' -ForegroundColor Yellow

$buildId = Join-Path $ProjectDir '.next\BUILD_ID'
if (-not (Test-Path $buildId)) {
    Write-Host '      Build produksi tidak ditemukan - menjalankan build (sekali saja, agak lama)...' -ForegroundColor Yellow
    Push-Location $ProjectDir
    & cmd /c 'npx next build > build-demo.log 2>&1'
    Pop-Location
    if (-not (Test-Path $buildId)) {
        Write-Host '      GAGAL build! Periksa C:\opac\build-demo.log' -ForegroundColor Red
        Read-Host 'Tekan Enter untuk keluar'
        exit 1
    }
}

Push-Location $ProjectDir
Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', "npx next start > `"$ServerLog`" 2>&1" `
    -WindowStyle Hidden
Pop-Location

# Tunggu sampai server benar-benar hidup
$serverReady = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3000/katalog' -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) { $serverReady = $true; break }
    } catch { }
}
if ($serverReady) {
    Write-Host '      Server hidup di http://localhost:3000' -ForegroundColor Green
} else {
    Write-Host '      Server belum merespons - periksa log: ' -ForegroundColor Red
    Write-Host "      $ServerLog" -ForegroundColor Red
    Read-Host 'Tekan Enter untuk tetap melanjutkan (atau Ctrl+C batal)'
}

# ---------- [3/4] Mulai tunnel Cloudflare ----------
Write-Host '[3/4] Membuat tunnel publik Cloudflare...' -ForegroundColor Yellow

$cloudflared = Join-Path $CloudflaredDir 'cloudflared.exe'
if (-not (Test-Path $cloudflared)) {
    Write-Host '      cloudflared belum ada - mengunduh (52 MB, sekali saja)...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $CloudflaredDir | Out-Null
    & curl.exe -sL -o $cloudflared 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    if (-not (Test-Path $cloudflared)) {
        Write-Host '      GAGAL mengunduh cloudflared!' -ForegroundColor Red
        Read-Host 'Tekan Enter untuk keluar'
        exit 1
    }
}

Remove-Item $TunnelLog, $TunnelOut, $UrlFile -ErrorAction SilentlyContinue
# --protocol http2: jaringan kampus kerap memblokir UDP (QUIC) sehingga
# tunnel default tidak pernah bisa diakses dari luar. http2 memakai TCP.
Start-Process -FilePath $cloudflared `
    -ArgumentList 'tunnel', '--url', 'http://localhost:3000', '--protocol', 'http2' `
    -RedirectStandardOutput $TunnelOut `
    -RedirectStandardError $TunnelLog `
    -WindowStyle Hidden

# Tunnel butuh 5-15 detik untuk mendapat URL dari Cloudflare
$publicUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    $log = ''
    if (Test-Path $TunnelLog) { $log += Get-Content $TunnelLog -Raw }
    if (Test-Path $TunnelOut) { $log += Get-Content $TunnelOut -Raw }
    $match = [regex]::Match($log, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $publicUrl = $match.Value; break }
}

if (-not $publicUrl) {
    Write-Host '      GAGAL mendapat URL tunnel. Periksa log:' -ForegroundColor Red
    Write-Host "      $TunnelLog" -ForegroundColor Red
    Read-Host 'Tekan Enter untuk keluar'
    exit 1
}

# ---------- [4/4] Verifikasi URL publik ----------
Write-Host '[4/4] Memverifikasi URL publik...' -ForegroundColor Yellow
$publicOk = $false
for ($i = 0; $i -lt 6; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$publicUrl/katalog" -UseBasicParsing -TimeoutSec 15
        if ($r.StatusCode -eq 200) { $publicOk = $true; break }
    } catch { }
    Start-Sleep -Seconds 3
}

$publicUrl | Out-File -FilePath $UrlFile -Encoding utf8

Write-Host ''
Write-Host '=============================================' -ForegroundColor Green
if ($publicOk) { Write-Host '   DEMO SIAP!' -ForegroundColor Green }
else { Write-Host '   Tunnel dibuat (verifikasi belum lolos)' -ForegroundColor Yellow }
Write-Host '=============================================' -ForegroundColor Green
Write-Host ''
Write-Host "   URL PUBLIK :" -ForegroundColor White
Write-Host "   $publicUrl" -ForegroundColor Green
Write-Host ''
Write-Host "   URL ini juga tersimpan di: $UrlFile" -ForegroundColor Gray
Write-Host ''
Write-Host '   Akun demo anggota :' -ForegroundColor White
Write-Host '   anggota@mercubuana.ac.id / Anggota#2026' -ForegroundColor Gray
Write-Host ''
Write-Host '   PENTING:' -ForegroundColor Yellow
Write-Host '   - Biarkan jendela PowerShell ini & PC tetap menyala.' -ForegroundColor Yellow
Write-Host '   - Menutup jendela ini TIDAK menghentikan server/tunnel;' -ForegroundColor Yellow
Write-Host '     gunakan stop-demo.ps1 untuk menghentikan.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Tekan Enter untuk menutup jendela ini (demo tetap jalan)'
