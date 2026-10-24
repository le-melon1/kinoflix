@echo off
chcp 65001 >nul
title KinoFlix — Instant Torrent Cinema

cd /d "%~dp0"

echo ==========================================================
echo   🎬 KinoFlix — Запуск для Windows
echo ==========================================================

REM 1. Проверка наличия Python
set PYTHON_CMD=
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python
) else (
    py -3 --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set PYTHON_CMD=py -3
    )
)

if "%PYTHON_CMD%"=="" (
    echo.
    echo [ОШИБКА] Python 3 не обнаружен!
    echo Установите Python с официального сайта: https://www.python.org/downloads/
    echo ВАЖНО: При установке обязательно включите галочку "Add Python to PATH"!
    echo.
    pause
    exit /b 1
)

REM 2. Создание виртуального окружения при первом запуске
if not exist ".venv\Scripts\activate.bat" (
    echo [1/3] Создание виртуального окружения (.venv)...
    %PYTHON_CMD% -m venv .venv
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Не удалось создать виртуальное окружение.
        pause
        exit /b 1
    )
    echo [2/3] Установка необходимых библиотек...
    call .venv\Scripts\python -m pip install --upgrade pip
    call .venv\Scripts\pip install -r requirements.txt
) else (
    REM Если uvicorn еще не установлен в venv
    if not exist ".venv\Scripts\uvicorn.exe" (
        echo [2/3] Установка библиотек...
        call .venv\Scripts\pip install -r requirements.txt
    )
)

REM 3. Проверка и автозагрузка TorrServer для Windows
if not exist "bin" mkdir bin
if not exist "bin\TorrServer.exe" (
    if not exist "bin\TorrServer-windows-amd64.exe" (
        echo [3/3] Загрузка движка TorrServer для Windows...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/YouROK/TorrServer/releases/latest/download/TorrServer-windows-amd64.exe', 'bin\TorrServer.exe')"
        if exist "bin\TorrServer.exe" (
            echo TorrServer успешно установлен.
        ) else (
            echo Внимание: Не удалось автоматически загрузить TorrServer.exe, сервер попытается загрузить его при старте.
        )
    )
)

echo.
echo ==========================================================
echo   🎬 KinoFlix успешно готов к работе!
echo   🌐 Открываем в браузере: http://localhost:7890
echo   ⚡ Движок потокового вещания активен
echo ==========================================================
echo.

REM Автоматическое открытие браузера
start "" "http://localhost:7890"

REM Запуск веб-сервера KinoFlix
call .venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 7890

if %ERRORLEVEL% neq 0 (
    echo.
    echo Сервер завершил работу с ошибкой.
    pause
)
