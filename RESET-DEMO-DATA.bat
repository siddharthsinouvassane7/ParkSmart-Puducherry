@echo off
cd /d "%~dp0"
echo This deletes data\db.json so fresh demo data is created on next START.
choice /M "Continue"
if errorlevel 2 exit /b
if exist data\db.json del data\db.json
echo Done. Now double-click START.bat
pause
