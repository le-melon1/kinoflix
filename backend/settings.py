import os
import json
from typing import Dict, Any

SETTINGS_PATH = os.path.expanduser("~/.config/kinoflix/settings.json")
DEFAULT_DOWNLOADS_DIR = os.path.expanduser("~/Downloads/KinoFlix")

DEFAULT_SETTINGS: Dict[str, Any] = {
    "playback": {
        "default_quality": "4k",          # "4k", "1080p", "auto"
        "preferred_audio": "Любая",        # "Любая", "Официальный дубляж", "Red Head Sound", "LostFilm", "Кубик в Кубе", "HDRezka"
        "autoplay_next": True,            # True / False
        "seek_step": 10                   # 5, 10, 15
    },
    "performance": {
        "ram_cache_mb": 256,              # 64, 128, 256, 512
        "preload_enabled": True,          # True / False
        "download_speed_limit_kb": 8000   # 0, 4000, 8000, 15000
    },
    "downloads": {
        "download_dir": DEFAULT_DOWNLOADS_DIR,
        "notify_on_complete": True
    },
    "search": {
        "min_seeders": 2,                 # 2, 3, 5, 10, 20
        "trackers": {
            "rutor": True,
            "rutracker": True
        }
    },
    "ui": {
        "mode": "desktop",                # "desktop" or "tv"
        "hero_trailer": True              # True / False
    },
    "network": {
        "custom_proxy": ""
    }
}


def _deep_merge(default: dict, override: dict) -> dict:
    result = dict(default)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


class SettingsManager:
    def __init__(self):
        self._settings = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(SETTINGS_PATH):
            try:
                with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return _deep_merge(DEFAULT_SETTINGS, data)
            except Exception as e:
                print(f"Error loading settings: {e}")
        return dict(DEFAULT_SETTINGS)

    def get_all(self) -> Dict[str, Any]:
        return dict(self._settings)

    def get(self, section: str, key: str = None, default: Any = None) -> Any:
        sec = self._settings.get(section, {})
        if key is None:
            return sec
        return sec.get(key, default)

    def update(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        self._settings = _deep_merge(self._settings, updates)
        self._save()
        self._apply_side_effects()
        return self.get_all()

    def _save(self):
        os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
        try:
            with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
                json.dump(self._settings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")

    def _apply_side_effects(self):
        """Propagate settings changes to live services"""
        try:
            from backend.torrserver import torrserver_mgr
            # Cache size in RAM
            ram_mb = self.get("performance", "ram_cache_mb", 256)
            torrserver_mgr.set_cache_size(ram_mb)

            # Speed limit
            speed_limit = self.get("performance", "download_speed_limit_kb", 8000)
            torrserver_mgr.download_limit_kb = speed_limit
            torrserver_mgr.apply_network_safety_settings()
        except Exception as e:
            print(f"Settings side effect (torrserver): {e}")

        try:
            from backend.download_manager import download_mgr
            d_dir = self.get("downloads", "download_dir", DEFAULT_DOWNLOADS_DIR)
            download_mgr.downloads_dir = d_dir
        except Exception as e:
            print(f"Settings side effect (downloads): {e}")

        try:
            from backend.rutracker import rutracker_client
            proxy = self.get("network", "custom_proxy", "")
            if proxy:
                rutracker_client.custom_proxy = proxy.strip()
                rutracker_client.save_config()
        except Exception as e:
            print(f"Settings side effect (rutracker): {e}")


settings_mgr = SettingsManager()
