@echo off
title ParkSmart Puducherry - Puducherry Police Hackathon 2026
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this computer.
  echo   Install the LTS version from https://nodejs.org and double-click START.bat again.
  echo.
  pause
  exit /b
)
node server\server.js
echo.
echo   The server stopped. Read the message above.
pause
