@echo off
chcp 65001 >nul
title 4R4P Talent Management System

set "APP_DIR=%~dp0"
set "PATH=%APP_DIR%;%PATH%"

echo ========================================
echo    4R4P Talent Management System
echo ========================================
echo.
echo   Starting server, please wait...
echo.

cd /d "%APP_DIR%backend"
"%APP_DIR%node.exe" server.js

echo.
pause
