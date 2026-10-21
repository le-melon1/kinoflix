@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ====================================
echo   Запуск KinoFlix...
echo ====================================
start "" python desktop_app.py
