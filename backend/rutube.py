"""
Rutube Search & Clean Stream Extractor for KinoFlix
Extracts direct HLS streams (.m3u8) without advertisements.
"""

import json
import urllib.parse
import urllib.request
import subprocess
import shutil
import sys
import os
from typing import List, Dict, Any, Optional

def get_direct_ip() -> Optional[str]:
    try:
        from backend.torrserver import get_physical_net_info
        iface, ip, gw = get_physical_net_info()
        return ip
    except Exception:
        return None

import html

def format_rutube_duration(seconds: int) -> str:
    if not seconds or seconds <= 0:
        return ""
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}ч {m}м"
    return f"{m} мин"

def search_rutube(query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """
    Searches Rutube for videos by query.
    Returns list of items with id, title, duration, duration_str, author, thumbnail, video_url.
    Filters out 24/7 TV channels and live broadcast trash.
    """
    direct_ip = get_direct_ip()
    encoded_query = urllib.parse.quote(query)
    api_url = f"https://rutube.ru/api/search/video/?query={encoded_query}"

    try:
        cmd = ["curl", "-s", "--connect-timeout", "5", "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"]
        if direct_ip:
            cmd.extend(["--interface", direct_ip])
        cmd.append(api_url)

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if res.returncode == 0 and res.stdout:
            data = json.loads(res.stdout)
            raw_results = data.get("results", [])
            results = []
            garbage_markers = ["прямой эфир", "телеканал", "онлайн-трансляция", "новости дня"]
            for item in raw_results:
                vid_id = item.get("id")
                if not vid_id:
                    continue
                raw_title = html.unescape(item.get("title", "")).strip()
                duration = item.get("duration", 0) or 0

                # Filter out 24/7 TV channels / live streams with duration 0 or live broadcast markers
                t_lower = raw_title.lower()
                if duration == 0 and any(m in t_lower for m in garbage_markers):
                    continue

                results.append({
                    "id": vid_id,
                    "title": raw_title,
                    "description": html.unescape(item.get("description", "") or "").strip(),
                    "duration": duration,
                    "duration_str": format_rutube_duration(duration),
                    "author": html.unescape(item.get("author", {}).get("name", "") if isinstance(item.get("author"), dict) else ""),
                    "thumbnail": item.get("thumbnail_url", ""),
                    "video_url": item.get("video_url", f"https://rutube.ru/video/{vid_id}/"),
                    "source": "rutube"
                })
                if len(results) >= limit:
                    break
            return results
    except Exception as e:
        print(f"[Rutube] Search error: {e}")

    return []

def get_rutube_stream(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Extracts direct ad-free .m3u8 stream from Rutube by video_id or video_url.
    Prioritizes yt-dlp which resolves to river-*.rutube.ru without geo-403 blocks.
    """
    direct_ip = get_direct_ip()
    clean_id = video_id.replace("https://rutube.ru/video/", "").strip("/")
    video_url = f"https://rutube.ru/video/{clean_id}/" if not video_id.startswith("http") else video_id

    # 1. Primary: yt-dlp extractor (resolves directly to river-*.rutube.ru CDN)
    try:
        venv_yt_win = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "Scripts", "yt-dlp.exe")
        venv_yt_nix = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "bin", "yt-dlp")
        yt_bin = venv_yt_win if os.path.exists(venv_yt_win) else (venv_yt_nix if os.path.exists(venv_yt_nix) else (shutil.which("yt-dlp") or "yt-dlp"))

        cmd = [yt_bin, "-g", "--no-warnings", "--no-playlist"]
        if direct_ip:
            cmd.extend(["--source-address", direct_ip])
        cmd.append(video_url)

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if res.returncode == 0 and res.stdout.strip():
            url = res.stdout.strip().split("\n")[0]
            proxied_url = f"/api/online/proxy_stream?url={urllib.parse.quote(url, safe='')}"
            return {
                "stream_url": proxied_url,
                "raw_stream_url": url,
                "type": "hls" if ".m3u8" in url else "mp4",
                "title": "",
                "thumbnail": "",
                "source": "rutube"
            }
    except Exception as e:
        print(f"[Rutube] yt-dlp extraction error: {e}")

    # 2. Fallback: native Rutube play/options API
    try:
        api_url = f"https://rutube.ru/api/play/options/{clean_id}/?format=json"
        cmd = ["curl", "-s", "--connect-timeout", "5", "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"]
        if direct_ip:
            cmd.extend(["--interface", direct_ip])
        cmd.append(api_url)

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if res.returncode == 0 and res.stdout:
            data = json.loads(res.stdout)
            balancer = data.get("video_balancer") or {}
            m3u8_url = balancer.get("m3u8") or balancer.get("default")
            if not m3u8_url:
                for k, v in balancer.items():
                    if isinstance(v, str) and (".m3u8" in v or ".mp4" in v):
                        m3u8_url = v
                        break
            if m3u8_url:
                proxied_url = f"/api/online/proxy_stream?url={urllib.parse.quote(m3u8_url, safe='')}"
                return {
                    "stream_url": proxied_url,
                    "raw_stream_url": m3u8_url,
                    "type": "hls" if ".m3u8" in m3u8_url else "mp4",
                    "title": data.get("title", ""),
                    "thumbnail": data.get("thumbnail_url", ""),
                    "source": "rutube"
                }
            acl = data.get("acl_status") or data.get("error")
            print(f"[Rutube] Balancer missing stream, ACL/status: {acl}")
    except Exception as e:
        print(f"[Rutube] Play options API error: {e}")

    return None
