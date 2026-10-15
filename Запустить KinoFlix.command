#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Compile VPN bypass library if missing
if [ ! -f "$DIR/bin/bind_direct.dylib" ]; then
    echo "Компиляция библиотеки раздельного туннелирования (обход VPN)..."
    clang -dynamiclib -O2 -o "$DIR/bin/bind_direct.dylib" "$DIR/bin/bind_direct.c"
fi

# Ensure TorrServer has execute permission
chmod +x "$DIR/bin/TorrServer" 2>/dev/null || true


# Check virtualenv
if [ ! -d "$DIR/.venv" ]; then
    echo "Создание виртуального окружения..."
    python3 -m venv "$DIR/.venv"
    "$DIR/.venv/bin/pip" install fastapi uvicorn httpx beautifulsoup4 requests python-multipart
fi

echo "=========================================================="
echo "  🎬 Запуск KinoFlix — Мгновенный торрент-кинотеатр"
echo "  🌐 Откройте в браузере: http://localhost:7890"
echo "  ⚡ Движок потокового вещания готов к работе"
echo "=========================================================="

# Auto-open browser in background
(sleep 1.5 && open "http://localhost:7890") &

# Run server with uvicorn
exec "$DIR/.venv/bin/uvicorn" backend.main:app --host 127.0.0.1 --port 7890
