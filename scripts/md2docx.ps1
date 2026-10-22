# Package OOXML staging into .docx (pure .NET, no Word required)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/md2docx.ps1 [-StagingDir DIR] [-OutputPath FILE]
param([string]$StagingDir, [string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
if (-not $StagingDir) { $StagingDir = Join-Path $root 'docs\_docx_staging' }
if (-not $OutputPath) { $OutputPath = Join-Path $root 'docs\garak_hansang_spec.docx' }

if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath -Force }

$parts = @(
    @{ Entry = '[Content_Types].xml'; File = (Join-Path $StagingDir '[Content_Types].xml') },
    @{ Entry = '_rels/.rels';         File = (Join-Path $StagingDir '_rels\.rels') },
    @{ Entry = 'word/document.xml';   File = (Join-Path $StagingDir 'word\document.xml') }
)

$zip = [System.IO.Compression.ZipFile]::Open($OutputPath, 'Create')
try {
    foreach ($p in $parts) {
        $src = $p.File
        if (-not (Test-Path -LiteralPath $src)) { throw "Missing staging file: $src" }
        $entry = $zip.CreateEntry($p.Entry, [System.IO.Compression.CompressionLevel]::Optimal)
        $s = $entry.Open()
        $bytes = [System.IO.File]::ReadAllBytes($src)
        $s.Write($bytes, 0, $bytes.Length)
        $s.Close()
        Write-Host ("packed: " + $p.Entry + " (" + $bytes.Length + " bytes)")
    }
} finally {
    $zip.Dispose()
}
Write-Host ("DOCX written: " + $OutputPath)


