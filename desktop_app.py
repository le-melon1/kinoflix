#!/usr/bin/env python3
"""
KinoFlix Desktop Application Launcher (macOS & Windows)
Wraps the KinoFlix web streaming platform into a standalone native desktop app.
"""
import os
import sys
import time
import socket
import subprocess
import threading
import webview

PORT = 7890
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

_server_process = None
_torrserver_process = None

def is_port_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def start_backend():
    global _server_process
    if is_port_open(HOST, PORT):
        print(f"Backend already running on {BASE_URL}")
        return

    # Determine base directory
    if getattr(sys, "frozen", False):
        base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    python_exe = sys.executable
    cmd = [python_exe, "-m", "uvicorn", "backend.main:app", "--host", HOST, "--port", str(PORT)]
    
    print("Starting KinoFlix backend server...")
    try:
        _server_process = subprocess.Popen(
            cmd,
            cwd=base_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception as e:
        print(f"Failed to start backend: {e}")

    # Wait for server to become responsive
    for _ in range(30):
        if is_port_open(HOST, PORT):
            print("KinoFlix backend is ready!")
            break
        time.sleep(0.3)

def cleanup():
    global _server_process
    if _server_process:
        print("Stopping KinoFlix backend...")
        try:
            _server_process.terminate()
            _server_process.wait(timeout=2)
        except Exception:
            try:
                _server_process.kill()
            except Exception:
                pass

def main():
    # Start backend server in background
    start_backend()

    # Create native application window
    window = webview.create_window(
        title="KinoFlix",
        url=BASE_URL,
        width=1280,
        height=820,
        min_size=(960, 600),
        background_color="#141414",
        text_select=False,
        confirm_close=False
    )

    try:
        webview.start(debug=False)
    finally:
        cleanup()

if __name__ == "__main__":
    main()
