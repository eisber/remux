#!/usr/bin/env pwsh
# Start remux with DevTunnel remote access.
# Usage: .\start.ps1 [--no-tunnel] [--password <pass>] [--session <name>]

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Build if needed.
if (-not (Test-Path "dist/backend/cli.js")) {
    Write-Host "Building remux..." -ForegroundColor Yellow
    npm run build
}

# Forward all arguments to the CLI.
node dist/backend/cli.js @args
