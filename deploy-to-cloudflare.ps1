# NightDev Cloudflare Pages Deployment Script
# PowerShell version for better error handling and cross-platform compatibility

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NightDev Cloudflare Pages Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
try {
    $wranglerVersion = wrangler --version 2>$null
    Write-Host "✓ Wrangler CLI found: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Wrangler CLI is not installed" -ForegroundColor Red
    Write-Host "Please install it with: npm install -g wrangler" -ForegroundColor Yellow
    Write-Host "Then run: wrangler login" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check authentication
Write-Host "Checking Wrangler authentication..." -ForegroundColor Yellow
try {
    $whoami = wrangler whoami 2>$null
    Write-Host "✓ Authenticated as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "You need to login to Cloudflare first" -ForegroundColor Yellow
    Write-Host "Running: wrangler login" -ForegroundColor Cyan
    wrangler login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Login failed. Please try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 1: Create KV Namespaces" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating production KV namespace..." -ForegroundColor Yellow
try {
    $prodKV = wrangler kv:namespace create "ANALYTICS_KV" 2>&1
    Write-Host "✓ Production KV namespace created" -ForegroundColor Green
    Write-Host $prodKV -ForegroundColor Gray
} catch {
    Write-Host "⚠ Warning: KV namespace creation failed or already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Creating preview KV namespace..." -ForegroundColor Yellow
try {
    $previewKV = wrangler kv:namespace create "ANALYTICS_KV" --preview 2>&1
    Write-Host "✓ Preview KV namespace created" -ForegroundColor Green
    Write-Host $previewKV -ForegroundColor Gray
} catch {
    Write-Host "⚠ Warning: Preview KV namespace creation failed or already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 2: Configuration Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANT: Before deploying, make sure to:" -ForegroundColor Red
Write-Host "1. Update the KV namespace IDs in wrangler.toml" -ForegroundColor Yellow
Write-Host "2. Set your Turnstile secret key in wrangler.toml" -ForegroundColor Yellow
Write-Host "3. Verify all your configuration is correct" -ForegroundColor Yellow
Write-Host ""

# Check if wrangler.toml exists and has placeholder values
if (Test-Path "wrangler.toml") {
    $wranglerContent = Get-Content "wrangler.toml" -Raw
    if ($wranglerContent -match "your-kv-namespace-id-here") {
        Write-Host "⚠ WARNING: wrangler.toml still contains placeholder KV namespace IDs!" -ForegroundColor Red
        Write-Host "Please update the KV namespace IDs with the actual values from above." -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "✗ Error: wrangler.toml not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$continue = Read-Host "Continue with deployment? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 3: Deploy to Cloudflare Pages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deploying to Cloudflare Pages..." -ForegroundColor Yellow
try {
    wrangler pages deploy . --project-name nightdev --compatibility-date 2024-01-01
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   Deployment Successful!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your site should now be available at:" -ForegroundColor Cyan
        Write-Host "https://nightdev.pages.dev" -ForegroundColor White
        Write-Host ""
        Write-Host "API endpoints available:" -ForegroundColor Cyan
        Write-Host "- https://nightdev.pages.dev/api/analytics/summary" -ForegroundColor White
        Write-Host "- https://nightdev.pages.dev/api/analytics/detailed" -ForegroundColor White
        Write-Host "- https://nightdev.pages.dev/api/track" -ForegroundColor White
        Write-Host "- https://nightdev.pages.dev/api/cf-track" -ForegroundColor White
        Write-Host "- https://nightdev.pages.dev/api/verify-turnstile" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test your site functionality" -ForegroundColor Yellow
        Write-Host "2. Check analytics are working" -ForegroundColor Yellow
        Write-Host "3. Verify Turnstile integration" -ForegroundColor Yellow
        Write-Host "4. Monitor Cloudflare Functions logs" -ForegroundColor Yellow
        Write-Host ""
    } else {
        throw "Deployment failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   Deployment Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and:" -ForegroundColor Yellow
    Write-Host "1. Verify your wrangler.toml configuration" -ForegroundColor White
    Write-Host "2. Make sure KV namespace IDs are correct" -ForegroundColor White
    Write-Host "3. Check your Cloudflare account permissions" -ForegroundColor White
    Write-Host "4. Try running: wrangler pages deploy . --project-name nightdev" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to exit"