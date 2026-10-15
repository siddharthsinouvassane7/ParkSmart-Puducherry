@echo off
REM Lets phones on the same Wi-Fi / hotspot open the prototype (ports 5050-5060).
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo Adding Windows Firewall rule "PPH2026 Apps" for TCP 5050-5060 ...
netsh advfirewall firewall delete rule name="PPH2026 Apps" >nul 2>&1
netsh advfirewall firewall add rule name="PPH2026 Apps" dir=in action=allow protocol=TCP localport=5050-5060 profile=any
echo Removing old rules that BLOCK Node.js (if any) ...
powershell -NoProfile -Command "Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Node.js*' -and $_.Action -eq 'Block' } | Remove-NetFirewallRule" >nul 2>&1
echo.
echo Done. Phones on the same Wi-Fi or hotspot can now open the app.
echo (College Wi-Fi often isolates devices - use a phone hotspot if it still does not open.)
pause
