@echo off
echo ==========================================
echo  KinoFlix Desktop App Builder for Windows
echo ==========================================

cd /d "%~dp0"

echo [1/3] Checking dependencies...
python -m pip install pywebview pyinstaller pillow

echo [2/3] Generating icons...
python generate_icons.py

echo [3/3] Building KinoFlix.exe...
python -m PyInstaller --clean -y KinoFlix.spec

echo.
echo ==========================================
echo  Build complete!
echo  Application is located at: dist\KinoFlix\KinoFlix.exe
echo ==========================================
pause
