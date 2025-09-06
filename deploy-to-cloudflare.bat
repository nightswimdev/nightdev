@echo off
echo ========================================
echo   NightDev Cloudflare Pages Deployment
echo ========================================
echo.

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Wrangler CLI is not installed
    echo Please install it with: npm install -g wrangler
    echo Then run: wrangler login
    pause
    exit /b 1
)

echo Checking Wrangler authentication...
wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo You need to login to Cloudflare first
    echo Running: wrangler login
    wrangler login
    if %errorlevel% neq 0 (
        echo Login failed. Please try again.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   Step 1: Create KV Namespaces
echo ========================================
echo.

echo Creating production KV namespace...
wrangler kv:namespace create "ANALYTICS_KV"
if %errorlevel% neq 0 (
    echo Warning: KV namespace creation failed or already exists
)

echo.
echo Creating preview KV namespace...
wrangler kv:namespace create "ANALYTICS_KV" --preview
if %errorlevel% neq 0 (
    echo Warning: Preview KV namespace creation failed or already exists
)

echo.
echo ========================================
echo   Step 2: Deploy to Cloudflare Pages
echo ========================================
echo.

echo IMPORTANT: Before deploying, make sure to:
echo 1. Update the KV namespace IDs in wrangler.toml
echo 2. Set your Turnstile secret key in wrangler.toml
echo 3. Verify all your configuration is correct
echo.

set /p continue="Continue with deployment? (y/n): "
if /i "%continue%" neq "y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo Deploying to Cloudflare Pages...
wrangler pages deploy . --project-name nightdev --compatibility-date 2024-01-01

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Deployment Successful!
    echo ========================================
    echo.
    echo Your site should now be available at:
    echo https://nightdev.pages.dev
    echo.
    echo API endpoints available:
    echo - https://nightdev.pages.dev/api/analytics/summary
    echo - https://nightdev.pages.dev/api/analytics/detailed
    echo - https://nightdev.pages.dev/api/track
    echo - https://nightdev.pages.dev/api/cf-track
    echo - https://nightdev.pages.dev/api/verify-turnstile
    echo.
    echo Next steps:
    echo 1. Test your site functionality
    echo 2. Check analytics are working
    echo 3. Verify Turnstile integration
    echo 4. Monitor Cloudflare Functions logs
    echo.
) else (
    echo.
    echo ========================================
    echo   Deployment Failed!
    echo ========================================
    echo.
    echo Please check the error messages above and:
    echo 1. Verify your wrangler.toml configuration
    echo 2. Make sure KV namespace IDs are correct
    echo 3. Check your Cloudflare account permissions
    echo 4. Try running: wrangler pages deploy . --project-name nightdev
    echo.
)

pause