import os
import subprocess
import time
import json
import re
import socket
import urllib.parse
from typing import Optional, Dict, Any, List, Tuple
import httpx

BIN_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin")
TORRSERVER_BIN = os.path.join(BIN_DIR, "TorrServer")
BIND_DIRECT_DYLIB = os.path.join(BIN_DIR, "bind_direct.dylib")
TORRSERVER_PORT = 8090
TORRSERVER_URL = f"http://127.0.0.1:{TORRSERVER_PORT}"
TORRSERVER_DIR = os.path.expanduser("~/.config/kinoflix/torrserver")

def get_physical_net_info() -> Tuple[str, str, Optional[str]]:
    """
    Find physical network interface (e.g. en0) and its IP to bypass VPN.
    """
    try:
        out = subprocess.check_output(['netstat', '-rn', '-f', 'inet'], text=True)
        for line in out.splitlines():
            parts = line.split()
            if len(parts) >= 4 and parts[0] == 'default' and parts[3].startswith('en'):
                gw = parts[1]
                iface = parts[3]
                ifconf = subprocess.check_output(['ifconfig', iface], text=True)
                m = re.search(r'inet\s+(\d+\.\d+\.\d+\.\d+)', ifconf)
                ip = m.group(1) if m else '127.0.0.1'
                return iface, ip, gw
    except Exception as e:
        print(f"Error detecting physical network: {e}")
def parse_series_episodes(video_files: List[Dict[str, Any]], default_season: int = 1) -> Dict[str, Any]:
    """
    Groups torrent video files by season and episode like Netflix.
    """
    seasons: Dict[str, List[Dict[str, Any]]] = {}
    for idx, f in enumerate(video_files):
        path = f.get("path", f.get("name", "")).replace("\\", "/")
        name = path.split("/")[-1]
        
        # Season detection: Season 1, Сезон 1, S01, 1x
        s_num = default_season
        s_m = re.search(r'(?:season|сезон|s)[\s._-]*0*(\d+)', path, re.IGNORECASE)
        if not s_m:
            s_m = re.search(r'(\d+)x\d+', path, re.IGNORECASE)
        if s_m:
            s_num = int(s_m.group(1))

        # Episode detection: Episode 1, Серия 1, E01, x01
        e_num = idx + 1
        e_m = re.search(r'(?:episode|серия|ep|e)[\s._-]*0*(\d+)', name, re.IGNORECASE)
        if not e_m:
            e_m = re.search(r'\d+x0*(\d+)', name, re.IGNORECASE)
        if not e_m:
            e_m = re.search(r'^[^\d]*0*(\d+)[.\s_-]', name)
        if e_m:
            e_num = int(e_m.group(1))

        # Clean title: strip S01E01, tags, extensions
        s = re.sub(r'^.*?[sS]\d+[\s._-]*[eE]\d+[\s._-]*', '', name)
        s = re.sub(r'^.*?\d+x\d+[\s._-]*', '', s)
        s = re.sub(r'^\d+[\s._-]+', '', s)
        s = re.sub(r'\.(mkv|mp4|avi|webm|ts|mov)$', '', s, flags=re.IGNORECASE)
        s = re.sub(r'(?:bdrip|web-dl|webrip|dvdrip|hdtv|1080p|720p|2160p|4k|x264|x265|hevc|avc|lostfilm|hdrezka|rhs|newstudio|xvid|ac3|dts|mp3|aac|flac|rus|eng).*$', '', s, flags=re.IGNORECASE)
        s = re.sub(r'[\s._-]+', ' ', s).strip()
        if not s or len(s) < 2 or re.match(r'^(rus|eng|mkv|mp4|avi|xvid|ac3)$', s, re.IGNORECASE):
            title = f'Серия {e_num}'
        else:
            title = f'{e_num}. {s}'

        size_mb = f.get('size_mb', 0)
        size_str = f'{size_mb} МБ' if size_mb < 1024 else f'{round(size_mb/1024, 1)} ГБ'

        dur_sec = 2700 if size_mb > 600 else 1440
        dur_est = '45 мин' if size_mb > 600 else '24 мин'
        ep_obj = {
            'id': f.get('id', idx + 1),
            'season': s_num,
            'episode': e_num,
            'title': title,
            'filename': name,
            'path': path,
            'size_mb': size_mb,
            'size_str': size_str,
            'duration_est': dur_est,
            'duration_seconds': dur_sec
        }
        
        s_key = str(s_num)
        if s_key not in seasons:
            seasons[s_key] = []
        seasons[s_key].append(ep_obj)

    # Sort episodes within each season by episode number
    for s_key in seasons:
        seasons[s_key].sort(key=lambda x: x['episode'])

    # Sort seasons numerically
    sorted_seasons = {k: seasons[k] for k in sorted(seasons.keys(), key=lambda x: int(x))}
    return sorted_seasons

_probe_cache: Dict[str, Dict[str, Any]] = {}

def probe_media_tracks(torrent_hash: str, index: int = 1) -> Dict[str, Any]:
    cache_key = f"{torrent_hash}_{index}"
    if cache_key in _probe_cache:
        return _probe_cache[cache_key]

    filename = ""
    try:
        r = httpx.post(f"{TORRSERVER_URL}/torrents", json={"action": "get", "hash": torrent_hash}, timeout=1.0)
        for f in r.json().get("file_stats", []):
            if f.get("id") == index:
                filename = f.get("path", "")
                break
    except Exception:
        pass

    url = f"{TORRSERVER_URL}/stream?link={torrent_hash}&index={index}&play"
    ffprobe_bin = "/opt/homebrew/bin/ffprobe" if os.path.exists("/opt/homebrew/bin/ffprobe") else "ffprobe"
    cmd = [
        ffprobe_bin,
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        "-probesize", "1500000",
        "-analyzeduration", "1500000",
        url
    ]
    try:
        res = subprocess.check_output(cmd, timeout=4.0)
        data = json.loads(res)
        audio_tracks = []
        video_codec = None
        pix_fmt = "yuv420p"
        width = 1920
        height = 1080
        for s in data.get("streams", []):
            if s.get("codec_type") == "video" and not video_codec:
                video_codec = (s.get("codec_name") or "").lower()
                pix_fmt = (s.get("pix_fmt") or "yuv420p").lower()
                width = int(s.get("width") or 1920)
                height = int(s.get("height") or 1080)
            elif s.get("codec_type") == "audio":
                idx = len(audio_tracks)
                c = s.get("codec_name", "ac3")
                title = s.get("tags", {}).get("title") or s.get("tags", {}).get("language") or f"Дорожка #{idx+1}"
                lang = s.get("tags", {}).get("language", "rus")
                audio_tracks.append({
                    "id": idx,
                    "codec": c,
                    "title": title,
                    "lang": lang,
                    "needs_transcode": c.lower() not in ("aac", "mp3")
                })
        duration = float(data.get("format", {}).get("duration", 0) or 0)

        if not video_codec:
            if filename.lower().endswith((".avi", ".wmv", ".flv", ".vob", ".mpg", ".mpeg", ".divx")):
                video_codec = "mpeg4"
            else:
                video_codec = "h264"

        res_dict = {
            "video_codec": video_codec,
            "pix_fmt": pix_fmt,
            "width": width,
            "height": height,
            "filename": filename,
            "duration": duration,
            "audio_tracks": audio_tracks
        }
        _probe_cache[cache_key] = res_dict
        return res_dict
    except Exception as e:
        is_legacy = filename.lower().endswith((".avi", ".wmv", ".flv", ".vob", ".mpg", ".mpeg", ".divx"))
        fallback = {
            "video_codec": "mpeg4" if is_legacy else "h264",
            "pix_fmt": "yuv420p",
            "width": 1920,
            "height": 1080,
            "filename": filename,
            "duration": 0,
            "audio_tracks": [
                {"id": 0, "codec": "aac", "title": "Основной звук (Русский дубляж)", "lang": "rus", "needs_transcode": True}
            ]
        }
        return fallback

class TorrServerManager:
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.active_hash: Optional[str] = None
        self.download_limit_kb: int = 0
        self.upload_limit_kb: int = 50  # low upload by default to save user bandwidth
        self.physical_iface: str = "en0"
        self.physical_ip: str = "127.0.0.1"

    def is_running(self) -> bool:
        try:
            r = httpx.post(f"{TORRSERVER_URL}/torrents", json={"action": "list"}, timeout=1.0)
            return r.status_code == 200
        except Exception:
            return False

    def start(self):
        iface, ip, _ = get_physical_net_info()
        need_restart = True
        if self.is_running():
            try:
                pids = subprocess.check_output(['pgrep', '-f', 'TorrServer'], text=True).strip().split()
                has_dylib = False
                for p in pids:
                    try:
                        lsof_out = subprocess.check_output(['lsof', '-p', p], text=True)
                        if 'bind_direct.dylib' in lsof_out:
                            has_dylib = True
                            break
                    except Exception:
                        pass
                if has_dylib and self.physical_ip == ip and self.physical_iface == iface:
                    need_restart = False
            except Exception:
                need_restart = True

        if not need_restart:
            return

        self.stop()
        try:
            subprocess.run(["pkill", "-9", "-f", "TorrServer"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        time.sleep(0.3)

        os.makedirs(TORRSERVER_DIR, exist_ok=True)
        if not os.path.exists(TORRSERVER_BIN):
            raise FileNotFoundError(f"TorrServer binary not found at {TORRSERVER_BIN}")
        
        # Detect physical interface to bypass VPN
        self.physical_iface = iface
        self.physical_ip = ip

        # Prepare environment with dynamic library interposer for physical VPN bypass
        env = os.environ.copy()
        env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
        if os.path.exists(BIND_DIRECT_DYLIB):
            env["DYLD_INSERT_LIBRARIES"] = BIND_DIRECT_DYLIB
            env["PHYSICAL_INTERFACE"] = self.physical_iface

        # Command: bind torrent p2p traffic to physical interface IP
        cmd = [
            TORRSERVER_BIN,
            "--port", str(TORRSERVER_PORT),
            "--path", TORRSERVER_DIR,
            "--torrentaddr", f"{self.physical_ip}:0"
        ]

        self.process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        # Wait up to 5s for startup
        for _ in range(25):
            time.sleep(0.2)
            if self.is_running():
                self.apply_network_safety_settings()
                break

    def stop(self):
        try:
            self.drop_all_torrents()
        except Exception:
            pass
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except Exception:
                self.process.kill()
            self.process = None

    def apply_network_safety_settings(self):
        """Apply high-speed peer and buffer settings strictly bypassing VPN"""
        try:
            trackers_str = "\n".join([
                "udp://tracker.opentrackr.org:1337/announce",
                "udp://open.stealth.si:80/announce",
                "udp://tracker.openbittorrent.com:6969/announce",
                "udp://tracker.torrent.eu.org:451/announce",
                "udp://explodie.org:6969/announce",
                "udp://tracker.cyberia.is:6969/announce",
                "udp://tracker.dler.org:6969/announce",
                "udp://tracker.tiny-vps.com:6969/announce",
                "udp://opentor.net:6969",
                "http://retracker.local/announce"
            ])
            settings = {
                "CacheSize": 268435456,         # 256MB RAM cache (smooth 1080p/4K)
                "ReaderReadAHead": 95,
                "PreloadCache": 25,
                "UseDisk": False,              # Stream strictly in RAM
                "ConnectionsLimit": 120,       # Up to 120 peer connections
                "DownloadRateLimit": 0,        # Max speed
                "UploadRateLimit": 0,          # Healthy seeding so swarm unchokes us
                "ForceEncrypt": False,
                "ResponsiveMode": True,
                "DisableUPNP": False,
                "DisableDHT": False,
                "DisablePEX": False,
                "DisableTCP": False,
                "DisableUTP": False,
                "DefaultTrackers": trackers_str,
                "RetrackersMode": 1
            }
            httpx.post(
                f"{TORRSERVER_URL}/settings",
                json={"action": "set", "sets": settings},
                timeout=10.0
            )
        except Exception as e:
            print(f"Warning: could not apply TorrServer settings immediately: {e}")

    async def add_torrent(self, link: str, title: str = "Movie") -> Dict[str, Any]:
        """Add magnet link or torrent URL to TorrServer and return parsed info"""
        self.start()
        import asyncio

        effective_link = link
        if effective_link.startswith("magnet:?"):
            public_trackers = [
                "udp://tracker.opentrackr.org:1337/announce",
                "udp://open.stealth.si:80/announce",
                "udp://tracker.openbittorrent.com:6969/announce",
                "udp://tracker.torrent.eu.org:451/announce",
                "udp://explodie.org:6969/announce",
                "udp://opentor.net:6969",
                "http://retracker.local/announce"
            ]
            for tr in public_trackers:
                if tr not in effective_link:
                    effective_link += f"&tr={tr}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "action": "add",
                "link": effective_link,
                "title": title,
                "save_to_db": False
            }
            res = await client.post(f"{TORRSERVER_URL}/torrents", json=payload)
            data = res.json()
            torrent_hash = data.get("hash")
            self.active_hash = torrent_hash

            # Poll for torrent metadata (file list) with non-blocking async sleep (up to 15s)
            file_stats = None
            for _ in range(25):
                await asyncio.sleep(0.5)
                try:
                    get_res = await client.post(f"{TORRSERVER_URL}/torrents", json={"action": "get", "hash": torrent_hash}, timeout=3.0)
                    info = get_res.json()
                    file_stats = info.get("file_stats", [])
                    if file_stats:
                        break
                except Exception:
                    pass

            video_exts = (".mkv", ".mp4", ".avi", ".webm", ".ts", ".m2ts", ".mov")
            file_list = []
            for item in file_stats or []:
                fn = item.get("path", "")
                size = item.get("length", 0)
                file_id = item.get("id", 1)
                is_video = any(fn.lower().endswith(ext) for ext in video_exts)
                file_list.append({
                    "id": file_id,
                    "name": fn.split("/")[-1],
                    "path": fn,
                    "size_bytes": size,
                    "size_mb": round(size / (1024 * 1024), 1),
                    "is_video": is_video
                })

            video_files = [f for f in file_list if f["is_video"]]
            is_series = len(video_files) > 1

            seasons_dict = {}
            if is_series:
                from backend.metadata import extract_season_info
                _, s_start, _, _ = extract_season_info(title)
                seasons_dict = parse_series_episodes(video_files, default_season=s_start or 1)
                enriched_video_files = []
                for s_k in sorted(seasons_dict.keys(), key=lambda x: int(x)):
                    enriched_video_files.extend(seasons_dict[s_k])
                if enriched_video_files:
                    video_files = enriched_video_files
                # First episode of first season is default
                first_season = next(iter(seasons_dict.values()), [])
                default_file = first_season[0] if first_season else video_files[0]
                default_index = default_file["id"]
            else:
                video_files.sort(key=lambda x: x["size_bytes"], reverse=True)
                default_file = video_files[0] if video_files else None
                default_index = default_file["id"] if default_file else 1

            file_size_mb = default_file.get("size_mb", 0) if default_file else 0
            if is_series:
                init_duration = default_file.get("duration_seconds", 2700 if file_size_mb > 600 else 1440)
            else:
                init_duration = max(3600, min(14400, int((file_size_mb / 28) * 60))) if file_size_mb > 500 else 5400

            file_name = default_file.get("name", default_file.get("filename", "video.mp4")) if default_file else "video.mp4"
            direct_url = f"{TORRSERVER_URL}/stream/{urllib.parse.quote(file_name)}?link={torrent_hash}&index={default_index}&play"
            # Browser stream URL with on-the-fly audio transcoding to AAC for guaranteed sound
            browser_url = f"/api/stream/browser?link={torrent_hash}&index={default_index}"

            return {
                "hash": torrent_hash,
                "title": title,
                "files": file_list,
                "video_files": video_files,
                "is_series": is_series,
                "seasons": seasons_dict,
                "default_index": default_index,
                "duration": init_duration,
                "stream_url": browser_url,
                "direct_url": direct_url,
                "bypass_vpn": True,
                "physical_interface": self.physical_iface
            }

    async def get_stats(self, torrent_hash: Optional[str] = None) -> Dict[str, Any]:
        """Get live stream statistics: buffer, speeds, peers"""
        h = torrent_hash or self.active_hash
        if not h:
            return {"active": False}
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.post(f"{TORRSERVER_URL}/torrents", json={"action": "get", "hash": h})
                data = res.json()
                stat = data.get("stat", 0)
                stat_string = data.get("stat_string", "")
                download_speed = data.get("download_speed", 0)
                upload_speed = data.get("upload_speed", 0)
                active_peers = data.get("active_peers", 0)
                total_peers = data.get("total_peers", 0)
                preloaded_bytes = data.get("preloaded_bytes", 0)
                preload_size = data.get("preload_size", 0)
                
                buf_percent = 0
                if preload_size > 0:
                    buf_percent = min(100, int((preloaded_bytes / preload_size) * 100))
                elif stat in (2, 3):
                    buf_percent = 100

                return {
                    "active": True,
                    "stat": stat,
                    "stat_string": stat_string,
                    "download_speed_mb": round(download_speed / (1024 * 1024), 2),
                    "upload_speed_kb": round(upload_speed / 1024, 1),
                    "active_peers": active_peers,
                    "total_peers": total_peers,
                    "buffer_percent": buf_percent,
                    "is_ready": stat >= 2 or buf_percent >= 90,
                    "bypass_vpn": True
                }
        except Exception:
            return {"active": False}

    async def start_preload_and_probe(self, torrent_hash: str, index: int = 1):
        """
        Pre-buffers the first seconds of the video into TorrServer RAM cache
        and warms up the ffprobe media track probe cache.
        """
        if not torrent_hash:
            return
        import asyncio
        try:
            preload_url = f"{TORRSERVER_URL}/stream/stream.mkv?link={torrent_hash}&index={index}&preload"
            async with httpx.AsyncClient(timeout=8.0) as client:
                try:
                    await client.get(preload_url)
                except Exception:
                    pass

            cache_key = f"{torrent_hash}_{index}"
            if cache_key not in _probe_cache:
                await asyncio.to_thread(probe_media_tracks, torrent_hash, index)
        except Exception as e:
            print(f"Preload notice: {e}")

    async def drop_torrent(self, torrent_hash: Optional[str] = None):
        """Immediately drop torrent from memory to release user's internet"""
        h = torrent_hash or self.active_hash
        if not h:
            return
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(f"{TORRSERVER_URL}/torrents", json={"action": "drop", "hash": h})
                await client.post(f"{TORRSERVER_URL}/torrents", json={"action": "rem", "hash": h})
            if self.active_hash == h:
                self.active_hash = None
        except Exception:
            pass

    def drop_all_torrents(self):
        try:
            r = httpx.post(f"{TORRSERVER_URL}/torrents", json={"action": "list"}, timeout=2.0)
            for t in r.json() or []:
                h = t.get("hash")
                if h:
                    httpx.post(f"{TORRSERVER_URL}/torrents", json={"action": "drop", "hash": h}, timeout=1.0)
                    httpx.post(f"{TORRSERVER_URL}/torrents", json={"action": "rem", "hash": h}, timeout=1.0)
        except Exception:
            pass

torrserver_mgr = TorrServerManager()
