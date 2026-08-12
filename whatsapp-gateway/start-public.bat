@echo off
title WhatsApp Gateway - Public Access
color 0A

echo.
echo  =========================================
echo   WhatsApp Gateway - Public Internet Mode
echo  =========================================
echo.

REM Check if ngrok is configured
ngrok config check >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] ngrok is not configured.
    echo.
    echo  Please do the following ONCE:
    echo  1. Go to https://dashboard.ngrok.com/signup
    echo  2. Sign up for a FREE account
    echo  3. Copy your Auth Token from: https://dashboard.ngrok.com/authtokens
    echo  4. Run this command in a terminal:
    echo     ngrok config add-authtoken YOUR_TOKEN_HERE
    echo  5. Then run this script again.
    echo.
    pause
    exit /b 1
)

REM Start the WhatsApp Gateway in a new window
echo  [1/2] Starting WhatsApp Gateway on port 5000...
start "WhatsApp Gateway Server" cmd /k "cd /d %~dp0 && node server.js"

REM Wait for gateway to start
timeout /t 3 /nobreak >nul

REM Read static domain from config file if exists
IF EXIST "%~dp0ngrok-domain.txt" (
    SET /p NGROK_DOMAIN=<"%~dp0ngrok-domain.txt"
    echo  [2/2] Starting ngrok tunnel with static domain: %NGROK_DOMAIN%
    start "ngrok Tunnel" cmd /k "ngrok http --domain=%NGROK_DOMAIN% 5000"
) ELSE (
    echo  [2/2] Starting ngrok tunnel (random URL)...
    echo  TIP: Get a FREE static URL - see instructions below.
    start "ngrok Tunnel" cmd /k "ngrok http 5000"
)

echo.
echo  =========================================
echo   HOW TO GET A FREE FIXED URL (One Time)
echo  =========================================
echo.
echo  1. Go to: https://dashboard.ngrok.com/domains
echo  2. Click "New Domain" to get your free static domain
echo     e.g. abc-xyz-123.ngrok-free.app
echo  3. Create a file called ngrok-domain.txt in this folder
echo  4. Paste your domain in that file (just the domain, no https://)
echo     e.g. abc-xyz-123.ngrok-free.app
echo  5. Next time you run this script, it uses your fixed URL!
echo.
echo  6. In the Laundry App Settings, set Gateway URL to:
echo     https://YOUR-DOMAIN.ngrok-free.app/messages/chat
echo.
echo  =========================================
echo.
echo  Gateway and tunnel are starting...
echo  Check the ngrok window for your public URL.
echo.
pause
