"""
VK Video Search & Clean Stream Extractor for KinoFlix
Extracts direct MP4 and HLS streams from VK Video without ads.
"""

import subprocess
import json
import urllib.parse
import re
import os
import shutil
import html
from typing import List, Dict, Any, Optional

def get_direct_ip() -> Optional[str]:
    try:
        from backend.torrserver import get_physical_net_info
        iface, ip, gw = get_physical_net_info()
        return ip
    except Exception:
        return None

def search_vk_video(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Searches VK Video for videos by query.
    Returns list of items with id, title, duration, thumbnail, video_url.
    """
    direct_ip = get_direct_ip()
    encoded_query = urllib.parse.quote(query)

    cmd = [
        "curl", "-s", "--connect-timeout", "5",
        "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-H", "X-Requested-With: XMLHttpRequest",
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "-H", "Referer: https://vk.com/",
    ]
    if direct_ip:
        cmd.extend(["--interface", direct_ip])
    cmd.extend([
        "-d", f"act=search_video&al=1&q={encoded_query}",
        "https://vk.com/al_video.php"
    ])

    try:
        res = subprocess.run(cmd, capture_output=True, timeout=8)
        if res.returncode == 0 and res.stdout:
            data = json.loads(res.stdout.decode("cp1251", errors="ignore"))
            payload = data.get("payload", [])
            results = []
            if len(payload) > 1 and len(payload[1]) > 2:
                raw_list = payload[1][2].get("list", [])
                for it in raw_list[:limit]:
                    if isinstance(it, dict):
                        owner_id = it.get('0')
                        vid_id = it.get('1')
                        thumb = it.get('2') or ''
                        raw_title = it.get('3') or ''
                        dur_str = it.get('5') or ''
                    elif isinstance(it, (list, tuple)) and len(it) >= 4:
                        owner_id = it[0]
                        vid_id = it[1]
                        thumb = it[2] if len(it) > 2 else ''
                        raw_title = it[3] if len(it) > 3 else ''
                        dur_str = it[5] if len(it) > 5 and isinstance(it[5], str) else ''
                    else:
                        continue

                    if owner_id is None or vid_id is None:
                        continue

                    title_clean = html.unescape(re.sub(r'<[^>]+>', '', str(raw_title))).strip()
                    video_key = f"{owner_id}_{vid_id}"

                    results.append({
                        "id": video_key,
                        "title": title_clean,
                        "duration_str": dur_str,
                        "thumbnail": thumb,
                        "video_url": f"https://vk.com/video{video_key}",
                        "source": "vk"
                    })
            return results
    except Exception as e:
        print(f"[VK Video] Search error: {e}")

    return []

def get_vk_stream(video_key: str) -> Optional[Dict[str, Any]]:
    """
    Extracts direct clean stream URL from VK Video via yt-dlp.
    Bypasses in-video ads, pre-rolls and mid-rolls.
    """
    direct_ip = get_direct_ip()
    video_url = f"https://vk.com/video{video_key}" if not video_key.startswith("http") else video_key

    try:
        venv_yt_win = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "Scripts", "yt-dlp.exe")
        venv_yt_nix = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "bin", "yt-dlp")
        yt_bin = venv_yt_win if os.path.exists(venv_yt_win) else (venv_yt_nix if os.path.exists(venv_yt_nix) else (shutil.which("yt-dlp") or "yt-dlp"))

        cmd = [yt_bin, "-g"]
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
                "video_url": video_url,
                "source": "vk"
            }
    except Exception as e:
        print(f"[VK Video] Stream extraction error: {e}")

    return None
