import os
import re
import asyncio
import urllib.parse
from typing import Optional, List, Dict, Any
import httpx
from fastapi import FastAPI, Query, HTTPException, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, StreamingResponse
from pydantic import BaseModel
import subprocess

from backend.rutor import search_rutor
from backend.rutracker import rutracker_client
from backend.torrserver import torrserver_mgr

app = FastAPI(title="KinoFlix - Instant Torrent Cinema")

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

class RuTrackerLoginRequest(BaseModel):
    username: str
    password: str

class RuTrackerCookieRequest(BaseModel):
    cookie: str
    username: Optional[str] = "RuTracker User"

class CustomProxyRequest(BaseModel):
    proxy_url: Optional[str] = None

class StreamPrepareRequest(BaseModel):
    link: Optional[str] = None
    magnet: Optional[str] = None
    topic_id: Optional[str] = None
    title: Optional[str] = "Movie"

class StreamStopRequest(BaseModel):
    torrent_hash: Optional[str] = None

class ExternalPlayerRequest(BaseModel):
    stream_url: str
    player: Optional[str] = "default"  # "iina", "vlc", "default"

class SpeedLimitRequest(BaseModel):
    download_kb: int
    upload_kb: int

@app.on_event("startup")
async def startup_event():
    # Warm up TorrServer and check rutracker session
    torrserver_mgr.start()
    await rutracker_client.check_session()

@app.on_event("shutdown")
async def shutdown_event():
    torrserver_mgr.stop()

@app.get("/api/network/status")
async def get_network_status():
    from backend.torrserver import get_physical_net_info
    iface, ip, gw = get_physical_net_info()
    proxy = rutracker_client.get_proxy()
    return {
        "physical_interface": iface,
        "physical_ip": ip,
        "physical_gateway": gw,
        "proxy_detected": proxy,
        "rutracker_routing": f"Через VPN / Прокси ({proxy})" if proxy else "Через системный VPN",
        "stream_routing": f"В обход VPN через {iface} (Прямой интернет)"
    }

@app.post("/api/settings/proxy")
async def set_custom_proxy(req: CustomProxyRequest):
    rutracker_client.custom_proxy = req.proxy_url.strip() if req.proxy_url else None
    rutracker_client.save_config()
    return {"status": "ok", "proxy": rutracker_client.get_proxy()}


@app.get("/api/catalog")
async def get_catalog():
    from backend.catalog import get_home_catalog
    return get_home_catalog()

@app.get("/api/catalog/more")
async def get_catalog_more(category: str = Query(...), page: int = Query(1)):
    from backend.catalog import get_more_category_movies
    items = await get_more_category_movies(category, page)
    return {
        "category": category,
        "page": page,
        "items": items,
        "has_more": len(items) > 0
    }

@app.get("/api/settings/rutracker/status")
async def get_rutracker_status():
    status = await rutracker_client.check_session()
    return status


@app.post("/api/settings/rutracker/login")
async def rutracker_login(req: RuTrackerLoginRequest):
    res = await rutracker_client.login(req.username, req.password)
    return res

@app.post("/api/settings/rutracker/cookie")
async def rutracker_set_cookie(req: RuTrackerCookieRequest):
    ok = rutracker_client.set_cookie_string(req.cookie, req.username)
    if ok:
        status = await rutracker_client.check_session()
        return {"success": True, "status": status}
    return {"success": False, "error": "Строка cookies должна содержать bb_session"}

@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1),
    source: str = "all",
    limit: int = 30
):
    query = q.strip()
    
    # Check if query is a direct magnet or rutracker URL
    if query.startswith("magnet:?"):
        return {
            "query": query,
            "direct_link": True,
            "type": "magnet",
            "results": [{
                "id": "direct_magnet",
                "source": "Прямой Magnet",
                "title": "Прямая ссылка Magnet",
                "magnet": query,
                "size": "Неизвестно",
                "seeds": 10,
                "quality": "Direct",
                "audio": "Original"
            }]
        }
    
    # Check if query is a RuTracker topic link
    topic_match = re.search(r'rutracker\.(?:org|net)/forum/viewtopic\.php\?t=(\d+)', query)
    if topic_match:
        t_id = topic_match.group(1)
        mag = await rutracker_client.get_topic_magnet(t_id)
        return {
            "query": query,
            "direct_link": True,
            "type": "rutracker_topic",
            "results": [{
                "id": f"rutracker_{t_id}",
                "source": "RuTracker",
                "title": f"Раздача RuTracker #{t_id}",
                "topic_id": t_id,
                "magnet": mag,
                "size": "В раздаче",
                "seeds": 10,
                "quality": "HD",
                "audio": "RuTracker Audio"
            }]
        }

    from backend.metadata import resolve_movie_online, curate_verified_editions, enrich_search_results

    # Automatically discover canonical Russian and original titles online
    online_info = await resolve_movie_online(query)
    search_terms = online_info.get("search_terms") or [query]
    
    results = []
    seen_ids = set()

    for q_term in search_terms:
        # Search Rutor (sorted by seeds descending)
        if source in ("all", "rutor"):
            rutor_results = await search_rutor(q_term, limit=limit, min_seeds=2)
            for r in rutor_results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    results.append(r)

        # Search RuTracker if logged in or selected
        if source in ("all", "rutracker"):
            rutracker_results = await rutracker_client.search(q_term, limit=limit)
            for r in rutracker_results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    results.append(r)

        # If we already found top releases with >= 15 seeds, we have sufficient health
        if any(r.get("seeds", 0) >= 15 for r in results):
            break

    # STRICT FILTER: Never return dead torrents without seeds (seeds must be >= 1)
    results = [r for r in results if r.get("seeds", 0) >= 1]

    # Sort strictly by seeders descending
    results.sort(key=lambda x: x.get("seeds", 0), reverse=True)

    # Enrich each release with distinct artwork and title from TMDB
    results = await enrich_search_results(results)

    # Canonical movie metadata directly from online discovery
    movie_info = {
        "title": online_info.get("ru_title") or query,
        "original_title": online_info.get("orig_title") or query,
        "year": online_info.get("year") or "2024",
        "rating": online_info.get("rating") or "8.5",
        "poster": online_info.get("poster") or (results[0].get("poster") if results else None),
        "backdrop": online_info.get("backdrop") or (results[0].get("backdrop") if results else None),
        "plot": online_info.get("overview") or "",
        "genre": "Сериал" if online_info.get("is_series") else "Фильм",
        "duration_seconds": 2700 if online_info.get("is_series") else (results[0].get("duration_seconds", 5400) if results else 5400),
        "is_series": online_info.get("is_series", False)
    }
    verified_cards = curate_verified_editions(results, min_seeds=3)

    return {
        "query": query,
        "movie": movie_info,
        "verified_editions": verified_cards,
        "count": len(results),
        "results": results[:limit]
    }


@app.post("/api/stream/prepare")
async def prepare_stream(req: StreamPrepareRequest):
    magnet = req.magnet
    # If topic_id is provided, resolve magnet
    if not magnet and req.topic_id:
        magnet = await rutracker_client.get_topic_magnet(req.topic_id)
    
    # If link is provided (direct magnet or topic URL)
    if not magnet and req.link:
        if req.link.startswith("magnet:?"):
            magnet = req.link
        else:
            t_m = re.search(r'viewtopic\.php\?t=(\d+)', req.link)
            if t_m:
                magnet = await rutracker_client.get_topic_magnet(t_m.group(1))

    if not magnet:
        raise HTTPException(status_code=400, detail="Не удалось получить magnet-ссылку для этой раздачи")

    try:
        info = await torrserver_mgr.add_torrent(magnet, title=req.title or "Movie")
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка движка стриминга: {str(e)}")

@app.get("/api/stream/stats")
async def stream_stats(hash: Optional[str] = None):
    stats = await torrserver_mgr.get_stats(hash)
    return stats

@app.post("/api/stream/stop")
async def stream_stop(req: StreamStopRequest):
    """Drop torrent immediately to preserve user bandwidth"""
    await torrserver_mgr.drop_torrent(req.torrent_hash)
    return {"status": "dropped"}

@app.head("/api/stream/browser")
async def stream_browser_audio_head(link: str, index: int = 1):
    return Response(
        content=b"",
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "none",
            "Cache-Control": "no-cache",
            "Content-Type": "video/mp4"
        }
    )

@app.get("/api/stream/browser")
async def stream_browser_audio(
    link: str,
    index: int = 1,
    audio: Optional[int] = None,
    ss: Optional[float] = None
):
    """
    On-the-fly stream with AAC audio transcoding for Google Chrome.
    Copies video track with zero re-encoding (-c:v copy, 0% CPU),
    converts AC3/DTS/EAC3 audio to AAC stereo in real-time.
    Supports seeking via ?ss=<seconds>.
    Automatically selects Russian audio track if not specified.
    """
    torr_url = f"http://127.0.0.1:8090/stream/stream.mkv?link={link}&index={index}&play"
    ffmpeg_bin = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg"

    audio_idx = audio
    video_args = ["-c:v", "copy"]
    try:
        from backend.torrserver import probe_media_tracks, _probe_cache
        cache_key = f"{link}_{index}"
        tracks = _probe_cache.get(cache_key)
        if not tracks:
            tracks = await asyncio.to_thread(probe_media_tracks, link, index)
            
        v_codec = (tracks.get("video_codec") or "h264").lower()
        if v_codec in ("hevc", "h265"):
            # Apple Silicon hardware encoding: HEVC -> H.264 instant playback in Chrome
            video_args = ["-c:v", "h264_videotoolbox", "-b:v", "6000k", "-pix_fmt", "yuv420p"]
        else:
            video_args = ["-c:v", "copy"]

        if audio_idx is None:
            audio_tracks = tracks.get("audio_tracks", [])
            for t in audio_tracks:
                lang = (t.get("lang") or "").lower()
                title = (t.get("title") or "").lower()
                if "rus" in lang or "рус" in title or "дубляж" in title or "голос" in title or "avo" in title:
                    audio_idx = t["id"]
                    break
            if audio_idx is None:
                audio_idx = 0
    except Exception:
        if audio_idx is None:
            audio_idx = 0
        video_args = ["-c:v", "copy"]

    cmd = [
        ffmpeg_bin,
        "-loglevel", "error",
    ]
    if ss and ss > 0:
        cmd.extend(["-ss", str(ss)])
    cmd.extend([
        "-i", torr_url,
        "-map", "0:v:0",
        "-map", f"0:a:{audio_idx}?",
    ])
    cmd.extend(video_args)
    cmd.extend([
        "-c:a", "aac",
        "-b:a", "256k",
        "-ac", "2",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "pipe:1"
    ])

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=1024*1024
    )

    async def iter_chunks():
        try:
            while True:
                chunk = await asyncio.to_thread(proc.stdout.read, 65536)
                if not chunk:
                    break
                yield chunk
        finally:
            try:
                proc.terminate()
                proc.wait(timeout=0.5)
            except Exception:
                proc.kill()

    return StreamingResponse(
        iter_chunks(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "none",
            "Cache-Control": "no-cache",
            "Content-Type": "video/mp4"
        }
    )

_img_cache: Dict[str, Dict[str, Any]] = {}

@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """
    Proxies external images to avoid CORS and hotlinking restrictions.
    Caches in memory.
    """
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")
    if url in _img_cache:
        c = _img_cache[url]
        return Response(content=c["bytes"], media_type=c["type"], headers={"Cache-Control": "public, max-age=604800"})

    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/*"
            }
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                media_type = r.headers.get("content-type", "image/jpeg")
                if len(_img_cache) < 200:
                    _img_cache[url] = {"bytes": r.content, "type": media_type}
                return Response(content=r.content, media_type=media_type, headers={"Cache-Control": "public, max-age=604800"})
    except Exception:
        pass

    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="#181818"/><text x="50%" y="50%" fill="#555" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">KinoFlix</text></svg>'
    return Response(content=svg.encode('utf-8'), media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=3600"})

@app.get("/api/stream/tracks")
async def stream_tracks(link: str, index: int = 1):
    """Probe audio tracks and exact duration using ffprobe in non-blocking thread"""
    from backend.torrserver import probe_media_tracks
    return await asyncio.to_thread(probe_media_tracks, link, index)

@app.post("/api/settings/speed-limit")
async def set_speed_limit(req: SpeedLimitRequest):
    torrserver_mgr.download_limit_kb = req.download_kb
    torrserver_mgr.upload_limit_kb = req.upload_kb
    torrserver_mgr.apply_network_safety_settings()
    return {"status": "ok", "download_kb": req.download_kb, "upload_kb": req.upload_kb}

@app.post("/api/open-external")
async def open_external(req: ExternalPlayerRequest):
    url = req.stream_url
    player = req.player.lower()
    
    # On macOS, try opening in chosen app
    try:
        if player == "iina":
            subprocess.Popen(["open", "-a", "IINA", url])
        elif player == "vlc":
            subprocess.Popen(["open", "-a", "VLC", url])
        else:
            # Try IINA first, then VLC, then default
            res = subprocess.run(["open", "-a", "IINA", url], capture_output=True)
            if res.returncode != 0:
                subprocess.Popen(["open", "-a", "VLC", url])
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/rutracker/download/{topic_id}")
async def download_rutracker_torrent(topic_id: str):
    data = await rutracker_client.download_torrent_file(topic_id)
    if not data:
        raise HTTPException(status_code=404, detail="Не удалось скачать торрент-файл (требуется авторизация в RuTracker)")
    return Response(
        content=data,
        media_type="application/x-bittorrent",
        headers={"Content-Disposition": f'attachment; filename="rutracker_{topic_id}.torrent"'}
    )

DOWNLOADS_DIR = os.path.expanduser("~/Downloads/KinoFlix")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

class DownloadStartRequest(BaseModel):
    torrent_hash: str
    file_id: int = 1
    filename: str
    title: Optional[str] = None

@app.get("/api/downloads/list")
async def list_downloads():
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    items = []
    try:
        for fname in os.listdir(DOWNLOADS_DIR):
            if fname.startswith("."):
                continue
            fpath = os.path.join(DOWNLOADS_DIR, fname)
            if os.path.isfile(fpath):
                st = os.stat(fpath)
                size_mb = round(st.st_size / (1024 * 1024), 1)
                size_str = f"{size_mb} МБ" if size_mb < 1024 else f"{round(size_mb / 1024, 2)} ГБ"
                items.append({
                    "filename": fname,
                    "title": fname.rsplit(".", 1)[0],
                    "size_mb": size_mb,
                    "size_str": size_str,
                    "path": fpath,
                    "mtime": st.st_mtime,
                    "stream_url": f"/api/downloads/play/{urllib.parse.quote(fname)}",
                    "is_complete": not fname.endswith(".part")
                })
        items.sort(key=lambda x: x["mtime"], reverse=True)
    except Exception as e:
        print(f"Error listing downloads: {e}")

    return {
        "downloads_dir": DOWNLOADS_DIR,
        "items": items
    }

@app.post("/api/downloads/open-folder")
async def open_downloads_folder():
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    try:
        subprocess.Popen(["open", DOWNLOADS_DIR])
        return {"success": True, "path": DOWNLOADS_DIR}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/downloads/start")
async def start_download(req: DownloadStartRequest):
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    safe_name = re.sub(r'[\\/*?:"<>|]', "_", req.filename)
    target_path = os.path.join(DOWNLOADS_DIR, safe_name)

    if os.path.exists(target_path) and os.path.getsize(target_path) > 1024 * 1024:
        return {"status": "already_exists", "path": target_path, "filename": safe_name}

    stream_src = f"http://127.0.0.1:8090/stream/{urllib.parse.quote(safe_name)}?link={req.torrent_hash}&index={req.file_id}&play"
    part_path = target_path + ".part"

    async def download_file_task():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", stream_src) as resp:
                    with open(part_path, "wb") as f:
                        async for chunk in resp.aiter_bytes(chunk_size=256 * 1024):
                            f.write(chunk)
            if os.path.exists(part_path):
                os.rename(part_path, target_path)
        except Exception as e:
            print(f"Background download error: {e}")

    asyncio.create_task(download_file_task())
    return {"status": "started", "path": target_path, "filename": safe_name}

@app.delete("/api/downloads/{filename}")
async def delete_download(filename: str):
    safe_name = os.path.basename(filename)
    target = os.path.join(DOWNLOADS_DIR, safe_name)
    part = target + ".part"
    deleted = False
    if os.path.exists(target):
        os.remove(target)
        deleted = True
    if os.path.exists(part):
        os.remove(part)
        deleted = True
    return {"success": deleted}

@app.get("/api/downloads/play/{filename}")
async def play_downloaded(filename: str):
    safe_name = os.path.basename(filename)
    target = os.path.join(DOWNLOADS_DIR, safe_name)
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(target, media_type="video/mp4")

# Mount static frontend
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
