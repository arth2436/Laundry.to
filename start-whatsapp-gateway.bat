@echo off
title WhatsApp Gateway & Secure Public Tunnel Launcher
echo ==========================================================
echo       LaundryTO WhatsApp Gateway Launcher
echo ==========================================================
echo.
echo [1/2] Starting WhatsApp API Gateway Server...
start cmd /k "cd /d e:\Laundry\whatsapp-gateway && npm start"

echo.
echo [2/2] Launching Secure Public Tunnel...
echo.
echo ----------------------------------------------------------
echo IMPORTANT:
echo Once the tunnel starts, it will display a public URL
echo like: https://xxxxxx.pinggy.link
echo.
echo Copy that HTTPS URL and paste it in the portal settings
echo under the "Company Profile" -> "WhatsApp Gateway URL" field.
echo.
echo This public link will work from ANY device (tablets, phones)
echo on ANY Wi-Fi or mobile network in the world!
echo ----------------------------------------------------------
echo.
echo Launching tunnel now...
ssh -R 80:localhost:5000 a.pinggy.io
pause
