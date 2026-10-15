@echo off
title Self-test
cd /d "%~dp0"
node server\selftest.js
pause
