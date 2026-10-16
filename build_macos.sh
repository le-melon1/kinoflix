#!/bin/bash
set -e

echo "=========================================="
echo "🎬 Сборка приложения KinoFlix для macOS"
echo "=========================================="

cd "$(dirname "$0")"

# Generate icons if not exists
if [ ! -f "static/icons/icon.icns" ]; then
    echo "Генерация иконок macOS..."
    .venv/bin/python3 generate_icons.py
fi

# Run PyInstaller
echo "Компиляция KinoFlix.app..."
.venv/bin/pyinstaller --clean -y KinoFlix.spec

echo ""
echo "=========================================="
echo "✔ Сборка успешно завершена!"
echo "Приложение готово: dist/KinoFlix.app"
echo "Вы можете запустить его командой: open dist/KinoFlix.app"
echo "Или перетащить в папку /Applications (Программы)"
echo "=========================================="
