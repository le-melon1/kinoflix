import backend.metadata  # Early monkeypatch for socket.getaddrinfo (DoH & anti-DNS-poisoning)
import os
import sys
import re
import shutil
import platform
import asyncio
import urllib.parse
from typing import Optional, List, Dict, Any
import httpx
from fastapi import FastAPI, Query, HTTPException, Response, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, StreamingResponse
from pydantic import BaseModel
import subprocess
import threading

def get_ffmpeg_bin() -> str:
    if sys.platform == "darwin" and os.path.exists("/opt/homebrew/bin/ffmpeg"):
        return "/opt/homebrew/bin/ffmpeg"
    elif sys.platform == "win32":
        bin_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bin")
        for cand in [os.path.join(bin_dir, "ffmpeg.exe"), "ffmpeg.exe", "ffmpeg"]:
            if shutil.which(cand) or os.path.exists(cand):
                return cand
    return "ffmpeg"

from backend.rutor import search_rutor, search_torrents_csv, search_apibay
from backend.rutracker import rutracker_client
from backend.torrserver import torrserver_mgr
from backend.settings import settings_mgr

app = FastAPI(title="KinoFlix - Instant Torrent Cinema", version="3.2.3")

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.endswith((".js", ".css", ".html")) or path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
    index: Optional[int] = None

class StreamStopRequest(BaseModel):
    torrent_hash: Optional[str] = None

class ExternalPlayerRequest(BaseModel):
    stream_url: str
    player: Optional[str] = "default"  # "iina", "vlc", "default"

class SpeedLimitRequest(BaseModel):
    download_kb: int
    upload_kb: int

@app.on_event("startup")
def startup_event():
    import threading
    def bg():
        try:
            torrserver_mgr.start()
            settings_mgr._apply_side_effects()
        except Exception as e:
            print(f"Background warmup error: {e}")
    threading.Thread(target=bg, daemon=True).start()

@app.on_event("shutdown")
async def shutdown_event():
    torrserver_mgr.stop()

@app.get("/api/network/status")
async def get_network_status():
    from backend.torrserver import get_physical_net_info, is_vpn_active
    vpn_on = is_vpn_active()
    iface, ip, gw = get_physical_net_info()
    proxy = rutracker_client.get_proxy()
    return {
        "vpn_active": vpn_on,
        "physical_interface": iface,
        "physical_ip": ip,
        "physical_gateway": gw,
        "proxy_detected": proxy,
        "rutracker_routing": f"Кастомный прокси ({proxy})" if proxy else f"В обход VPN через rutracker.net ({iface})",
        "stream_routing": f"В обход VPN через {iface} (Прямой интернет)" if vpn_on else f"Прямой домашний интернет ({iface})"
    }

@app.post("/api/settings/proxy")
async def set_custom_proxy(req: CustomProxyRequest):
    rutracker_client.custom_proxy = req.proxy_url.strip() if req.proxy_url else None
    rutracker_client.save_config()
    settings_mgr.update({"network": {"custom_proxy": rutracker_client.custom_proxy or ""}})
    return {"status": "ok", "proxy": rutracker_client.get_proxy()}

@app.get("/api/settings")
async def get_settings():
    """Retrieve all current persistent settings and live status"""
    data = settings_mgr.get_all()
    data["current_proxy"] = rutracker_client.get_proxy()
    return data

@app.post("/api/settings")
async def update_settings(req: Dict[str, Any]):
    """Update and persist settings with instant live application"""
    updated = settings_mgr.update(req)
    return updated

@app.post("/api/settings/cache/clear")
async def clear_cache_endpoint():
    """Immediately flush TorrServer RAM and drop background torrents"""
    res = torrserver_mgr.clear_cache()
    return res

@app.post("/api/settings/history/clear")
async def clear_history_endpoint():
    """Clear server-side cache and acknowledge history reset"""
    return {"status": "ok", "message": "История просмотров очищена"}


def rewrite_image_urls(obj):
    if isinstance(obj, dict):
        return {k: rewrite_image_urls(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [rewrite_image_urls(elem) for elem in obj]
    elif isinstance(obj, str):
        if "image.tmdb.org/t/p/" in obj or "wsrv.nl/?url=image.tmdb.org/t/p/" in obj:
            idx = obj.find("/t/p/")
            if idx != -1:
                return f"/api/image/tmdb?path={obj[idx+4:]}"
        return obj
    return obj

_IMG_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".img_cache")
os.makedirs(_IMG_CACHE_DIR, exist_ok=True)
_img_cache: Dict[str, tuple] = {}
_img_lock = threading.Lock()

@app.get("/api/image/tmdb")
async def tmdb_image_proxy(path: str = Query(...)):
    """Proxy TMDB images with disk and RAM caching so user browser displays covers even if TMDB domain is DNS-filtered"""
    clean_path = path.lstrip("/")
    
    # 1. Check RAM cache
    with _img_lock:
        if clean_path in _img_cache:
            content, media_type = _img_cache[clean_path]
            return Response(
                content=content,
                media_type=media_type,
                headers={"Cache-Control": "public, max-age=604800"}
            )

    # 2. Check Disk cache
    cache_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean_path)
    cache_filepath = os.path.join(_IMG_CACHE_DIR, cache_filename)
    if os.path.exists(cache_filepath):
        try:
            with open(cache_filepath, "rb") as f:
                content = f.read()
            media_type = "image/jpeg" if clean_path.endswith((".jpg", ".jpeg")) else "image/png"
            with _img_lock:
                if len(_img_cache) < 800:
                    _img_cache[clean_path] = (content, media_type)
            return Response(
                content=content,
                media_type=media_type,
                headers={"Cache-Control": "public, max-age=604800"}
            )
        except Exception:
            pass

    # 3. Direct fetch from TMDB Fastly CDN / BunnyCDN / wsrv.nl mirror
    from backend.metadata import get_direct_client
    fetch_candidates = [
        f"https://image.tmdb.org/t/p/{clean_path}",
        f"https://tmdb-image-prod.b-cdn.net/t/p/{clean_path}",
        f"https://wsrv.nl/?url=image.tmdb.org/t/p/{clean_path}"
    ]
    for tmdb_cdn_url in fetch_candidates:
        try:
            async with get_direct_client(timeout=5.0) as client:
                resp = await client.get(tmdb_cdn_url)
                if resp.status_code == 200 and len(resp.content) > 100:
                    media_type = resp.headers.get("content-type", "image/jpeg")
                    try:
                        with open(cache_filepath, "wb") as f:
                            f.write(resp.content)
                    except Exception:
                        pass
                    with _img_lock:
                        if len(_img_cache) > 800:
                            _img_cache.clear()
                        _img_cache[clean_path] = (resp.content, media_type)
                    return Response(
                        content=resp.content,
                        media_type=media_type,
                        headers={"Cache-Control": "public, max-age=604800"}
                    )
        except Exception:
            continue
    raise HTTPException(status_code=404, detail="Image not found")

@app.get("/api/image-proxy")
async def image_proxy_legacy(url: str = Query(...)):
    """Legacy proxy alias ensuring backwards compatibility with any UI version"""
    if "/t/p/" in url:
        return await tmdb_image_proxy(path=url.split("/t/p/", 1)[1])
    return await tmdb_image_proxy(path=url)

@app.get("/api/catalog")
async def get_catalog():
    from backend.catalog import get_home_catalog
    return rewrite_image_urls(get_home_catalog())

@app.get("/api/catalog/more")
async def get_catalog_more(category: str = Query(...), page: int = Query(1)):
    from backend.catalog import get_more_category_movies
    items = await get_more_category_movies(category, page)
    return rewrite_image_urls({
        "category": category,
        "page": page,
        "items": items,
        "has_more": len(items) > 0
    })

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
    search_terms = list(online_info.get("search_terms") or [])
    if query not in search_terms:
        search_terms.append(query)
    
    min_seeds = settings_mgr.get("search", "min_seeders", 2)
    pref_quality = settings_mgr.get("playback", "default_quality", "4k")
    pref_audio = settings_mgr.get("playback", "preferred_audio", "Любая")
    trackers = settings_mgr.get("search", "trackers", {"rutor": True, "rutracker": True})

    results = []
    seen_ids = set()

    async def _fetch_from_tracker(func, *args):
        try:
            return await func(*args)
        except Exception:
            return []

    search_tasks = []
    for q_term in search_terms:
        if source in ("all", "rutor") and trackers.get("rutor", True):
            search_tasks.append(_fetch_from_tracker(search_rutor, q_term, limit, min_seeds))
        if source in ("all", "rutracker") and trackers.get("rutracker", True) and rutracker_client.is_logged_in:
            search_tasks.append(_fetch_from_tracker(rutracker_client.search, q_term, limit))
        search_tasks.append(_fetch_from_tracker(search_torrents_csv, q_term, limit, 1))

    if search_tasks:
        task_results = await asyncio.gather(*search_tasks, return_exceptions=True)
        for t_res in task_results:
            if isinstance(t_res, list):
                for r in t_res:
                    if r.get("id") and r["id"] not in seen_ids:
                        seen_ids.add(r["id"])
                        results.append(r)

    # STRICT FILTER: Prefer releases with >= min_seeds, fallback to >= 1 seed if none found
    healthy_results = [r for r in results if r.get("seeds", 0) >= min_seeds]
    if not healthy_results:
        healthy_results = [r for r in results if r.get("seeds", 0) >= 1]
    results = healthy_results

    # Sort strictly by seeders descending
    results.sort(key=lambda x: x.get("seeds", 0), reverse=True)

    # Enrich each release with distinct artwork and title from TMDB
    results = await enrich_search_results(results)

    # Ensure every individual release card has a valid poster/backdrop
    fallback_poster = online_info.get("poster")
    fallback_backdrop = online_info.get("backdrop") or fallback_poster
    for r in results:
        if not r.get("poster"):
            r["poster"] = fallback_poster or fallback_backdrop
        if not r.get("backdrop"):
            r["backdrop"] = fallback_backdrop or r.get("poster")

    has_seasons = any(r.get("season_label") for r in results)
    is_tv = online_info.get("is_series", False) or has_seasons
    max_season = max([r.get("season_end") or 1 for r in results if r.get("season_end")], default=1)
    duration_str = f"{max_season} Сезон{'а' if 1 < max_season < 5 else ('ов' if max_season >= 5 else '')}" if is_tv and max_season > 1 else ("1 Сезон" if is_tv else "2 ч 15 мин")

    movie_info = {
        "title": online_info.get("ru_title") or query,
        "original_title": online_info.get("orig_title") or query,
        "year": (results[0].get("display_year") if results else None) or online_info.get("year") or "2024",
        "rating": online_info.get("rating") or "8.5",
        "poster": online_info.get("poster") or (results[0].get("poster") if results else None),
        "backdrop": online_info.get("backdrop") or (results[0].get("backdrop") if results else None),
        "plot": online_info.get("overview") or "",
        "genre": "Сериал" if is_tv else "Фильм",
        "duration": duration_str,
        "duration_seconds": 2700 if is_tv else (results[0].get("duration_seconds", 5400) if results else 5400),
        "is_series": is_tv,
        "total_seasons": max_season
    }
    verified_cards = curate_verified_editions(
        results,
        min_seeds=min_seeds,
        preferred_quality=pref_quality,
        preferred_audio=pref_audio
    )

    return rewrite_image_urls({
        "query": query,
        "movie": movie_info,
        "verified_editions": verified_cards,
        "count": len(results),
        "results": results[:limit]
    })


async def resolve_magnet_for_request(req: StreamPrepareRequest) -> Optional[str]:
    magnet = req.magnet
    # 1. If direct link is provided
    if not magnet and req.link:
        if req.link.startswith("magnet:?"):
            magnet = req.link
        else:
            t_m = re.search(r'viewtopic\.php\?t=(\d+)', req.link)
            if t_m:
                magnet = await rutracker_client.get_topic_magnet(t_m.group(1))
    
    # 2. If topic_id is provided, try rutracker_client
    if not magnet and req.topic_id:
        magnet = await rutracker_client.get_topic_magnet(req.topic_id)

    # 3. SMART NO-VPN FALLBACK: If magnet is still missing, automatically resolve from Rutor or Torrents-CSV by title!
    if not magnet and req.title:
        search_q = req.title.strip()
        clean_q = re.sub(r'[/\\?%*:|"<>\[\]]', ' ', search_q).strip()
        clean_q = re.sub(r'\s+', ' ', clean_q)

        from backend.metadata import extract_movie_names
        parsed = extract_movie_names(clean_q)
        terms = []
        if clean_q:
            terms.append(clean_q)
        if parsed.get("ru_title") and parsed["ru_title"] not in terms:
            terms.append(parsed["ru_title"])
        if parsed.get("en_title") and parsed["en_title"] not in terms:
            terms.append(parsed["en_title"])

        for term in terms:
            try:
                candidates = await search_rutor(term, limit=10, min_seeds=1)
                if candidates:
                    q_tag = "1080" if "1080" in clean_q else ("2160" if ("2160" in clean_q or "4K" in clean_q.upper()) else "")
                    chosen = candidates[0]
                    if q_tag:
                        for c in candidates:
                            if q_tag in c.get("title", ""):
                                chosen = c
                                break
                    if chosen.get("magnet"):
                        magnet = chosen["magnet"]
                        break
            except Exception:
                pass

        if not magnet:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    for term in terms:
                        r = await client.get(f"https://torrents-csv.com/service/search?q={urllib.parse.quote(term)}")
                        if r.status_code == 200:
                            t_list = r.json().get("torrents", [])
                            if t_list:
                                ih = t_list[0].get("infohash")
                                if ih:
                                    magnet = f"magnet:?xt=urn:btih:{ih}&dn={urllib.parse.quote(term)}&tr=http://retracker.local/announce&tr=udp://tracker.openbittorrent.com:80/announce&tr=udp://tracker.opentrackr.org:1337/announce"
                                    break
            except Exception:
                pass

    return magnet

@app.post("/api/stream/prepare")
async def prepare_stream(req: StreamPrepareRequest, background_tasks: BackgroundTasks):
    magnet = await resolve_magnet_for_request(req)
    if not magnet:
        raise HTTPException(status_code=400, detail="Не удалось получить magnet-ссылку для этой раздачи")

    try:
        info = await torrserver_mgr.add_torrent(magnet, title=req.title or "Movie")
        target_idx = req.index or info.get("default_index") or 1
        background_tasks.add_task(torrserver_mgr.start_preload_and_probe, info["hash"], target_idx)
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка движка стриминга: {str(e)}")

@app.post("/api/stream/preload")
async def preload_stream(req: StreamPrepareRequest, background_tasks: BackgroundTasks):
    """
    Preloads the first seconds of a movie or TV show as soon as user opens its page.
    Enables instant 0-second latency playback when user clicks Play.
    """
    magnet = await resolve_magnet_for_request(req)
    if not magnet:
        raise HTTPException(status_code=400, detail="Не удалось получить magnet-ссылку для предзагрузки")

    try:
        info = await torrserver_mgr.add_torrent(magnet, title=req.title or "Movie")
        target_idx = req.index or info.get("default_index") or 1
        background_tasks.add_task(torrserver_mgr.start_preload_and_probe, info["hash"], target_idx)
        info["preloading"] = True
        info["target_index"] = target_idx
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка предзагрузки: {str(e)}")

@app.get("/api/stream/stats")
async def stream_stats(hash: Optional[str] = None):
    stats = await torrserver_mgr.get_stats(hash)
    return stats

@app.post("/api/stream/stop")
async def stream_stop(req: StreamStopRequest):
    """Drop torrent immediately to preserve user bandwidth"""
    await torrserver_mgr.drop_torrent(req.torrent_hash)
    return {"status": "dropped"}

@app.get("/api/stream/dubbing-options")
async def get_dubbing_options(
    query: str = Query(..., min_length=1),
    current_hash: Optional[str] = None
):
    """
    Returns available voiceover/dubbing studio options across all torrent releases for this movie/show.
    Enables instant switching of dubbing studios directly in the video player.
    """
    from backend.rutor import search_rutor, search_torrents_csv, search_apibay
    from backend.metadata import extract_season_info
    
    clean_q = re.sub(r'\[.*?\]|\(.*?\)|1080p|2160p|4k|bdrip|web-dl', '', query, flags=re.IGNORECASE).strip()
    if not clean_q:
        clean_q = query

    KNOWN_STUDIOS = [
        (r'\b(red head sound|rhs)\b', 'Red Head Sound (RHS)'),
        (r'\b(hdrezka|rezka)\b', 'HDRezka Studio'),
        (r'\blostfilm\b', 'LostFilm'),
        (r'\b(кубик в кубе|kubik v kube)\b', 'Кубик в Кубе'),
        (r'\bjaskier\b', 'Jaskier'),
        (r'\btvshows\b', 'TVShows'),
        (r'\bnewstudio\b', 'NewStudio'),
        (r'\balexfilm\b', 'AlexFilm'),
        (r'\bflarrow\b', 'Flarrow Films'),
        (r'\b(сыендук|sndk)\b', 'Сыендук'),
        (r'\b(iyuno|невафильм|пифагор)\b', 'Официальный дубляж (Лицензия)'),
        (r'(\bдубляж\b|\bдублирован\b|\|\s*d\s*\||\bлицензи)', 'Полный дубляж (Лицензия)'),
        (r'(\bmvo\b|\|\s*p\s*\||\bмногоголос)', 'Профессиональный многоголосый (MVO)'),
        (r'(\bdvo\b|\|\s*dvo\s*\||\bдвухголос)', 'Двухголосый закадровый (DVO)'),
    ]

    results = await search_rutor(clean_q, limit=40, min_seeds=1)
    options = []
    seen_studios = set()

    for r in results:
        t = r.get("title", "")
        t_low = t.lower()
        if any(bad in t_low for bad in ["обои", "wallpaper", "soundtrack", " ost ", "ost]", "книга", "комикс", "mp3", "flac"]):
            continue
        
        studios_in_rel = []
        for pat, lbl in KNOWN_STUDIOS:
            if re.search(pat, t_low, re.IGNORECASE) and lbl not in studios_in_rel:
                studios_in_rel.append(lbl)
        if not studios_in_rel:
            studios_in_rel = ["Русская озвучка"]

        s_label, _, _, _ = extract_season_info(t)
        magnet = r.get("magnet") or ""
        m_hash = re.search(r'urn:btih:([a-zA-Z0-9]+)', magnet, re.IGNORECASE)
        hash_val = m_hash.group(1).lower() if m_hash else None

        is_active = False
        if current_hash and hash_val and current_hash.lower() == hash_val.lower():
            is_active = True

        q = r.get("quality", "HD")
        size = r.get("size", "")

        for studio in studios_in_rel:
            full_key = f"{studio}_{q}_{s_label or 'movie'}_{size}"
            if full_key not in seen_studios:
                seen_studios.add(full_key)
                name_parts = [studio]
                if s_label:
                    name_parts.append(s_label)
                if q:
                    name_parts.append(q)
                display_label = " • ".join(name_parts)

                options.append({
                    "id": r["id"],
                    "hash": hash_val,
                    "studio": studio,
                    "season_label": s_label,
                    "display_name": display_label,
                    "title": t,
                    "quality": q,
                    "seeds": r.get("seeds", 0),
                    "size": size,
                    "magnet": magnet,
                    "source": r.get("source", "Rutor"),
                    "is_active": is_active
                })

    # Sort options by seeders descending
    options.sort(key=lambda x: x["seeds"], reverse=True)

    return {
        "query": clean_q,
        "options": options[:20]
    }

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
    ss: Optional[float] = None,
    audio_delay: Optional[float] = 0.0
):
    """
    On-the-fly stream with AAC audio transcoding for Google Chrome.
    Copies video track with zero re-encoding (-c:v copy, 0% CPU),
    converts AC3/DTS/EAC3 audio to AAC stereo in real-time.
    Supports seeking via ?ss=<seconds> and audio offset via ?audio_delay=<seconds>.
    Includes sample-accurate aresample synchronization to prevent audio lag.
    """
    torr_url = f"http://127.0.0.1:8090/stream/stream.mkv?link={link}&index={index}&play"
    ffmpeg_bin = FFMPEG_BIN

    audio_idx = audio
    video_args = ["-c:v", "copy"]
    try:
        from backend.torrserver import probe_media_tracks, _probe_cache
        cache_key = f"{link}_{index}"
        tracks = _probe_cache.get(cache_key)
        if not tracks:
            tracks = await asyncio.to_thread(probe_media_tracks, link, index)
            
        v_codec = (tracks.get("video_codec") or "").lower()
        pix_fmt = (tracks.get("pix_fmt") or "yuv420p").lower()
        fname = (tracks.get("filename") or "").lower()

        # Check if video is safe for direct copy into Google Chrome:
        # Chrome ONLY natively plays 8-bit H.264 (yuv420p).
        # Any XviD/MPEG-4 (House M.D.), HEVC, VC-1, MPEG-2, or 10-bit H.264 will show a black screen in Chrome if copied.
        is_h264 = v_codec in ("h264", "avc", "avc1")
        is_8bit = "10" not in pix_fmt and "12" not in pix_fmt and "16" not in pix_fmt
        is_safe_container = not fname.endswith((".avi", ".wmv", ".vob", ".flv", ".mpg", ".mpeg", ".divx"))

        if is_h264 and is_8bit and is_safe_container:
            video_args = ["-c:v", "copy"]
        else:
            # VideoToolbox hardware encoder on macOS - 15x real-time speed, 0% CPU!
            # Eliminates black screen for XviD/AVI (Доктор Хаус), HEVC, 10-bit anime, etc.
            if os.path.exists("/opt/homebrew/bin/ffmpeg"):
                video_args = [
                    "-c:v", "h264_videotoolbox",
                    "-b:v", "4500k",
                    "-pix_fmt", "yuv420p",
                    "-realtime", "true"
                ]
            else:
                video_args = [
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-tune", "zerolatency",
                    "-b:v", "4000k",
                    "-pix_fmt", "yuv420p"
                ]

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
        fname = ""
        try:
            r = httpx.post("http://127.0.0.1:8090/torrents", json={"action": "get", "hash": link}, timeout=1.0)
            for f in r.json().get("file_stats", []):
                if f.get("id") == index:
                    fname = f.get("path", "").lower()
                    break
        except Exception:
            pass

        if fname.endswith((".avi", ".wmv", ".vob", ".flv", ".mpg", ".mpeg", ".divx")):
            video_args = [
                "-c:v", "h264_videotoolbox",
                "-b:v", "4500k",
                "-pix_fmt", "yuv420p",
                "-realtime", "true"
            ]
        else:
            video_args = ["-c:v", "copy"]

    cmd = [
        ffmpeg_bin,
        "-loglevel", "error",
        "-fflags", "+genpts+discardcorrupt",
    ]
    if ss and ss > 0:
        cmd.extend(["-ss", str(ss)])
    cmd.extend([
        "-i", torr_url,
        "-map", "0:v:0",
        "-map", f"0:a:{audio_idx}?",
    ])
    cmd.extend(video_args)

    af_filters = []
    if audio_delay and abs(audio_delay) >= 0.02:
        if audio_delay > 0:
            delay_ms = int(audio_delay * 1000)
            af_filters.append(f"adelay={delay_ms}|{delay_ms}")
        else:
            advance_sec = abs(audio_delay)
            af_filters.append(f"atrim=start={advance_sec},asetpts=PTS-STARTPTS")
    af_filters.append("aresample=async=1000:first_pts=0")

    cmd.extend([
        "-c:a", "aac",
        "-b:a", "256k",
        "-ac", "2",
        "-af", ",".join(af_filters),
        "-avoid_negative_ts", "make_zero",
        "-max_muxing_queue_size", "4096",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "pipe:1"
    ])

    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=1024*1024,
        creationflags=creationflags
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

@app.get("/api/stream/tracks")
async def stream_tracks(link: str, index: int = 1):
    """Probe audio tracks, subtitles and exact duration using ffprobe in non-blocking thread"""
    from backend.torrserver import probe_media_tracks
    return await asyncio.to_thread(probe_media_tracks, link, index)

@app.get("/api/stream/subtitles")
async def get_stream_subtitles(link: str, index: int = 1, sub_id: int = 0):
    """Extract embedded subtitle track and stream as WebVTT on the fly"""
    from backend.torrserver import TORRSERVER_URL
    ffmpeg_bin = get_ffmpeg_bin()
    torr_url = f"{TORRSERVER_URL}/stream?link={link}&index={index}&play"
    cmd = [
        ffmpeg_bin,
        "-loglevel", "error",
        "-i", torr_url,
        "-map", f"0:s:{sub_id}",
        "-f", "webvtt",
        "pipe:1"
    ]
    try:
        popen_kwargs = {"stdout": subprocess.PIPE, "stderr": subprocess.DEVNULL}
        if sys.platform == "win32":
            popen_kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        proc = subprocess.Popen(cmd, **popen_kwargs)
        out, _ = proc.communicate(timeout=6.0)
        if not out or not out.startswith(b"WEBVTT"):
            out = b"WEBVTT\n\n"
    except Exception:
        out = b"WEBVTT\n\n"
    return Response(content=out, media_type="text/vtt; charset=utf-8", headers={"Cache-Control": "no-cache"})

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
    
    try:
        if sys.platform == "darwin":
            if player == "iina":
                subprocess.Popen(["open", "-a", "IINA", url])
            elif player == "vlc":
                subprocess.Popen(["open", "-a", "VLC", url])
            else:
                res = subprocess.run(["open", "-a", "IINA", url], capture_output=True)
                if res.returncode != 0:
                    subprocess.Popen(["open", "-a", "VLC", url])
        elif sys.platform == "win32":
            vlc_candidates = [
                r"C:\Program Files\VideoLAN\VLC\vlc.exe",
                r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
                "vlc.exe"
            ]
            vlc_bin = None
            for cand in vlc_candidates:
                if os.path.exists(cand) or shutil.which(cand):
                    vlc_bin = cand
                    break
            
            if vlc_bin:
                subprocess.Popen([vlc_bin, url])
            else:
                os.startfile(url)
        else:
            subprocess.Popen(["xdg-open", url])
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

from backend.download_manager import download_mgr, DOWNLOADS_DIR

class DownloadStartRequest(BaseModel):
    torrent_hash: Optional[str] = None
    file_id: int = 1
    filename: Optional[str] = None
    title: Optional[str] = None
    poster: Optional[str] = ""
    magnet: Optional[str] = None
    topic_id: Optional[int] = None

@app.get("/api/downloads/list")
async def list_downloads():
    return download_mgr.get_status_payload()

@app.post("/api/downloads/open-folder")
async def open_downloads_folder():
    target = download_mgr.downloads_dir
    os.makedirs(target, exist_ok=True)
    try:
        if sys.platform == "win32":
            os.startfile(target)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", target])
        else:
            subprocess.Popen(["xdg-open", target])
        return {"success": True, "path": target}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/downloads/start")
async def start_download(req: DownloadStartRequest):
    res = await download_mgr.start_download(
        torrent_hash=req.torrent_hash,
        file_id=req.file_id,
        filename=req.filename,
        title=req.title,
        poster=req.poster or "",
        magnet=req.magnet,
        topic_id=req.topic_id
    )
    return res

@app.post("/api/downloads/cancel")
async def cancel_download_endpoint(payload: Dict[str, Any]):
    fname = payload.get("filename") or payload.get("id") or ""
    res = await download_mgr.cancel_download(fname)
    return {"success": res}

@app.delete("/api/downloads/{filename}")
async def delete_download(filename: str):
    res = await download_mgr.delete_download(filename)
    return {"success": res}

@app.get("/api/downloads/play/{filename}")
async def play_downloaded(filename: str):
    safe_name = os.path.basename(filename)
    target = os.path.join(download_mgr.downloads_dir, safe_name)
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(target, media_type="video/mp4")

# Mount static frontend
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
