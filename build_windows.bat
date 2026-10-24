@echo off
echo ==========================================
echo  KinoFlix Desktop App Builder for Windows
echo ==========================================

cd /d "%~dp0"

echo [1/4] Checking dependencies...
python -m pip install -r requirements.txt

echo [2/4] Ensuring TorrServer Windows engine...
if not exist "bin" mkdir bin
if not exist "bin\TorrServer.exe" (
    if not exist "bin\TorrServer-windows-amd64.exe" (
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/YouROK/TorrServer/releases/latest/download/TorrServer-windows-amd64.exe', 'bin\TorrServer.exe')"
    )
)

echo [3/4] Generating icons...
python generate_icons.py

echo [4/4] Building KinoFlix.exe...
python -m PyInstaller --clean -y KinoFlix.spec

echo.
echo ==========================================
echo  Application is located at: dist\KinoFlix.exe
echo ==========================================
pause
