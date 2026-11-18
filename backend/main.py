import backend.metadata  # Early monkeypatch for socket.getaddrinfo (DoH & anti-DNS-poisoning)
import os
import sys
import re
import shutil
import platform
import asyncio
import math
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
from backend.rutube import search_rutube, get_rutube_stream
from backend.vk_video import search_vk_video, get_vk_stream
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="KinoFlix - Instant Torrent Cinema", version="3.2.3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
PLUGINS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "plugins")

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
    season: Optional[int] = None
    episode: Optional[int] = None
    duration: Optional[int] = None

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

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "KinoFlix", "version": "1.0.0"}

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

def release_identity(release: Dict[str, Any]) -> str:
    magnet = release.get("magnet") or ""
    match = re.search(r"(?:[?&])xt=urn:btih:([a-zA-Z0-9]+)", magnet, re.IGNORECASE)
    if match:
        return "hash:" + match.group(1).lower()
    return "id:" + str(release.get("id", ""))


def title_matches_search(release: Dict[str, Any], terms: List[str]) -> bool:
    from backend.metadata import extract_movie_names

    def normalize(value: str) -> str:
        value = re.sub(r"[^\w]+", " ", (value or "").casefold()).strip()
        return re.sub(r"^(?:the|a|an)\s+", "", value)

    raw = release.get("title") or ""
    parsed = extract_movie_names(raw)
    candidates = [normalize(release.get("display_title") or ""),
                  normalize(parsed.get("ru_title") or ""),
                  normalize(parsed.get("en_title") or "")]
    for term in terms:
        wanted = normalize(term)
        if not wanted:
            continue
        for candidate in candidates:
            if candidate == wanted or candidate.startswith(wanted + " "):
                return True
    return False


def playback_score(release: Dict[str, Any]) -> float:
    title = (release.get("title") or "").lower()
    score = math.log1p(max(0, release.get("seeds") or 0)) * 10
    if any(x in title for x in ("1080p", "720p", "x264", "h264", "avc")):
        score += 8
    if any(x in title for x in ("2160p", "4k", "hevc", "x265", "remux")):
        score -= 10
    if release.get("audio") and release["audio"] not in ("Озвучка неизвестна", "Язык не указан"):
        score += 3
    return score


@app.get("/api/search")
async def search(
    q: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    season: Optional[int] = Query(None),
    episode: Optional[int] = Query(None),
    source: str = "all",
    limit: int = 30
):
    q_val = q if isinstance(q, str) else None
    query_val = query if isinstance(query, str) else None
    actual_q = (q_val or query_val or "").strip()
    if not actual_q:
        raise HTTPException(status_code=422, detail="Search query 'q' or 'query' is required")
    query = actual_q

    season = season if isinstance(season, int) else None
    episode = episode if isinstance(episode, int) else None

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

    # 1. Extract season / episode from query text if not explicitly passed
    raw_query = query
    if season is None:
        m_s = re.search(r'(?:s0*(\d{1,2})|\b(\d{1,2})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))', raw_query, re.I)
        if m_s:
            season = int(m_s.group(1) or m_s.group(2) or m_s.group(3))
    if episode is None:
        m_e = re.search(r'(?:e0*(\d{1,3})|\b(\d{1,3})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|серия|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*(\d{1,3}))', raw_query, re.I)
        if m_e:
            episode = int(m_e.group(1) or m_e.group(2) or m_e.group(3))

    clean_base = re.sub(r'(?:s0*\d{1,2}|\b\d{1,2}\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*\d{1,2})', '', raw_query, flags=re.I)
    clean_base = re.sub(r'(?:e0*\d{1,3}|\b\d{1,3}\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|серия|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*\d{1,3})', '', clean_base, flags=re.I)
    clean_base = re.sub(r'\s+(?:19|20)\d{2}$', '', clean_base).strip()
    clean_base = re.sub(r'[\s._-]+', ' ', clean_base).strip()

    clean_q = re.sub(r'\s+(?:19|20)\d{2}$', '', query).strip()
    online_info = await resolve_movie_online(clean_base or clean_q or query)
    ru_title = online_info.get("ru_title") or clean_base or query
    orig_title = online_info.get("orig_title")

    search_terms = []
    if season is not None:
        if episode is not None:
            if orig_title:
                search_terms.append(f"{orig_title} S{season:02d}E{episode:02d}")
            search_terms.append(f"{ru_title} {season} сезон {episode} серия")
            search_terms.append(f"{ru_title} {season} сезон {episode}")
        if orig_title:
            search_terms.append(f"{orig_title} S{season:02d}")
            search_terms.append(f"{orig_title} Season {season}")
        search_terms.append(f"{ru_title} {season} сезон")

    if ru_title and ru_title not in search_terms:
        search_terms.append(ru_title)
    if orig_title and orig_title not in search_terms:
        search_terms.append(orig_title)
    if clean_q and clean_q not in search_terms:
        search_terms.append(clean_q)
    if query not in search_terms:
        search_terms.append(query)

    min_seeds = settings_mgr.get("search", "min_seeders", 2)
    pref_quality = settings_mgr.get("playback", "default_quality", "4k")
    pref_audio = settings_mgr.get("playback", "preferred_audio", "Любая")
    trackers = settings_mgr.get("search", "trackers", {"rutor": True, "rutracker": True})

    results = []
    seen_ids = set()

    # Query title variants and enabled sources concurrently
    searches = []
    for q_term in search_terms:
        if source in ("all", "rutor") and trackers.get("rutor", True):
            searches.append(search_rutor(q_term, limit=limit, min_seeds=min_seeds))
        if source in ("all", "rutracker") and trackers.get("rutracker", True):
            searches.append(rutracker_client.search(q_term, limit=limit))
    for batch in await asyncio.gather(*searches, return_exceptions=True):
        if isinstance(batch, BaseException):
            continue
        for release in batch:
            if release["id"] not in seen_ids:
                seen_ids.add(release["id"])
                results.append(release)

    # STRICT FILTER: Never return dead torrents without seeds
    results = [r for r in results if r.get("seeds", 0) >= min_seeds]

    # Filter out PC game repacks and software
    game_pattern = re.compile(r'\b(fitgirl|dodi|repack by|gog|pc game|dlc pack|crack|repack|patch)\b', re.IGNORECASE)
    results = [r for r in results if not game_pattern.search(r.get("title", ""))]

    for r in results:
        t_raw = (r.get("title") or "").replace("_", " ")
        badge = ""
        rank = 50
        badge_note = ""

        if season is not None or episode is not None:
            m_ep = re.search(r'(?:s0*(\d{1,2})[ ._-]*e0*(\d{1,3})|\b0*(\d{1,2})x0*(\d{1,3})\b|\b0*(\d{1,2})\s*сезон\s*0*(\d{1,3})\s*сери[яи]|\bсери[яи]\s*0*(\d{1,3}))', t_raw, re.I)
            is_range = bool(re.search(r'(?:e\d{1,3}\s*[-–]\s*\d{1,3}|\d{1,3}\s*[-–]\s*\d{1,3}\s*сери[яи]|\bвсе\s*серии|\bcomplete\b)', t_raw, re.I))

            if m_ep and not is_range:
                g = [int(x) for x in m_ep.groups() if x is not None]
                s_found = g[0] if len(g) > 1 else None
                e_found = g[1] if len(g) > 1 else (g[0] if len(g) == 1 else None)
                if episode is not None and e_found == episode and (season is None or s_found is None or s_found == season):
                    badge = f"🟢 [СЕРИЯ НАЙДЕНА: S{season or s_found or 1} E{episode}]"
                    rank = 100
                    badge_note = "✅ Раздача конкретной серии"
                elif episode is not None and e_found is not None:
                    badge = f"⚪️ [ДРУГАЯ СЕРИЯ: S{s_found or '?'} E{e_found}]"
                    rank = 30
                    badge_note = f"⚠️ Другая серия (запрошена {episode})"

            if not badge and season is not None:
                m_s_range = re.search(r'(?:s0*(\d{1,2})\s*[-–]\s*s?0*(\d{1,2})|0*(\d{1,2})\s*[-–]\s*0*(\d{1,2})\s*сезон)', t_raw, re.I)
                m_s = re.search(r'(?:s0*(\d{1,2})|\b0*(\d{1,2})\s*сезон|\bseason\s*0*(\d{1,2}))', t_raw, re.I)
                if m_s_range:
                    nums = [int(x) for x in m_s_range.groups() if x is not None]
                    if len(nums) >= 2 and nums[0] <= season <= nums[1]:
                        badge = f"🔵 [ВСЕ СЕЗОНЫ: S{nums[0]}–S{nums[1]}]"
                        rank = 85
                        badge_note = f"📦 Сборник сезонов (серия {episode or 1} запустится сразу)"
                elif m_s:
                    nums = [int(x) for x in m_s.groups() if x is not None]
                    if nums and nums[0] == season:
                        badge = f"🔵 [ВЕСЬ СЕЗОН: S{season}]"
                        rank = 90
                        badge_note = f"📦 Полный {season} сезон (серия {episode or 1} запустится сразу)"
                    elif nums:
                        badge = f"⚪️ [ДРУГОЙ СЕЗОН: S{nums[0]}]"
                        rank = 30
                        badge_note = f"⚠️ Другой сезон (запрошен {season})"

        if not badge:
            badge = "🎬 [РАЗДАЧА]"
            rank = 60
            badge_note = ""

        r["badge"] = badge
        r["rank"] = rank
        r["badge_note"] = badge_note
        r["target_season"] = season
        r["target_episode"] = episode

    # Multiple indexes can return the same torrent under different IDs.
    results.sort(key=lambda x: x.get("seeds", 0), reverse=True)
    unique = {}
    for release in results:
        unique.setdefault(release_identity(release), release)
    results = list(unique.values())

    # Keep exact title matches and sequels, without mixing in unrelated films
    base_titles = [t for t in [ru_title, orig_title, clean_base, clean_q, query] if t]
    matching = [r for r in results if title_matches_search(r, base_titles)]
    if matching:
        results = matching

    # Sort so that exact episode torrents (rank 100) and full season torrents (rank 90) are first, ordered by seeds!
    results.sort(key=lambda x: (x.get("rank", 0), x.get("seeds", 0)), reverse=True)

    has_seasons = any(r.get("season_label") for r in results)
    is_tv = online_info.get("is_series", False) if online_info.get("year") else has_seasons
    max_season = max([r.get("season_end") or 1 for r in results if r.get("season_end")], default=1)
    duration_str = f"{max_season} Сезон{'а' if 1 < max_season < 5 else ('ов' if max_season >= 5 else '')}" if is_tv and max_season > 1 else ("1 Сезон" if is_tv else "2 ч 15 мин")

    movie_info = {
        "title": online_info.get("ru_title") or query,
        "original_title": online_info.get("orig_title") or query,
        "year": online_info.get("year") or (results[0].get("display_year") if results else None) or "",
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
    verified_cards = results[:2]

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

    if not magnet and (req.topic_id or req.link):
        raise HTTPException(status_code=400, detail="Не удалось получить ссылку выбранной раздачи. Попробуйте другую раздачу или проверьте вход в RuTracker")

    # Keep the selected release; only resolve by title for catalog items.
    if not magnet and req.title:
        from backend.catalog import get_catalog_magnet
        magnet = get_catalog_magnet(req.title)
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
        info = await torrserver_mgr.add_torrent(
            magnet,
            title=req.title or "Movie",
            target_season=req.season,
            target_episode=req.episode,
            duration=req.duration
        )
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
        info = await torrserver_mgr.add_torrent(
            magnet,
            title=req.title or "Movie",
            target_season=req.season,
            target_episode=req.episode,
            duration=req.duration
        )
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
    ffmpeg_bin = get_ffmpeg_bin()

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
        is_browser_pixel_format = pix_fmt in ("yuv420p", "yuvj420p")
        is_safe_container = not fname.endswith((".avi", ".wmv", ".vob", ".flv", ".mpg", ".mpeg", ".divx"))

        if is_h264 and is_browser_pixel_format and is_safe_container:
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

        # Unknown streams must be converted instead of assuming H.264.
        video_args = ["-c:v", "libx264", "-preset", "ultrafast",
                      "-tune", "zerolatency", "-b:v", "4000k", "-pix_fmt", "yuv420p"]

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

def parse_duration_sec(dur_str: str) -> int:
    if not dur_str:
        return 0
    if ":" in str(dur_str):
        parts = str(dur_str).split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
        except ValueError:
            pass
    m_h = re.search(r'(\d+)\s*(?:ч|час|h|hours?)', str(dur_str), re.I)
    m_m = re.search(r'(\d+)\s*(?:м|мин|min|minutes?)', str(dur_str), re.I)
    m_s = re.search(r'(\d+)\s*(?:с|сек|s|sec)', str(dur_str), re.I)
    sec = 0
    if m_h:
        sec += int(m_h.group(1)) * 3600
    if m_m:
        sec += int(m_m.group(1)) * 60
    if m_s:
        sec += int(m_s.group(1))
    return sec

ONLINE_JUNK_WORDS = [
    'обзор', 'разбор', 'реакция', 'прохождение', 'летсплей', 'геймплей', 'gameplay', 'letsplay',
    'игрофильм', 'тизер', 'отрывок', 'пародия', 'бэкстейдж', 'backstage', 'шортс', 'shorts',
    'клип', 'саундтрек', 'трейлер', 'trailer', 'teaser', 'анонс', 'фильм о фильме',
    'часть 1', 'часть 2', 'часть i', 'часть ii', 'part 1', 'part 2', 'part i', 'part ii',
    'walkthrough', 'playthrough', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo',
    'прямой эфир', 'новости дня', 'телеканал', 'онлайн-трансляция'
]

def classify_online_video(
    title: str,
    dur_str: str,
    target_season: Optional[int],
    target_episode: Optional[int],
    show_title: Optional[str] = None,
    orig_title: Optional[str] = None,
    is_series: bool = True
) -> Dict[str, Any]:
    duration_sec = parse_duration_sec(dur_str)
    t_lower = title.lower()

    # 1. Junk check (reviews, let's plays, trailers, parodies)
    for jw in ONLINE_JUNK_WORDS:
        if jw in t_lower:
            return {
                "badge": "🔴 [ОБЗОР / НЕ СЕРИЯ]",
                "rank": 10,
                "is_junk": True,
                "note": "Не является серией (обзор/игра/нарезка)"
            }

    # 2. Short clip check (< 10 min for TV episode)
    if is_series and target_episode is not None and 0 < duration_sec <= 600:
        return {
            "badge": "🔴 [КОРОТКИЙ РОЛИК / ОТРЫВОК]",
            "rank": 15,
            "is_junk": True,
            "note": f"Короткий фрагмент ({dur_str or 'до 10 мин'})"
        }

    # 3. Check title relevance if show_title is provided
    if show_title:
        s_words = [w for w in re.sub(r'[^\w\s]', ' ', show_title.lower()).split() if len(w) > 2]
        orig_words = [w for w in re.sub(r'[^\w\s]', ' ', (orig_title or '').lower()).split() if len(w) > 2]
        v_clean = re.sub(r'[^\w\s]', ' ', t_lower)
        has_match = (show_title.lower() in t_lower) or ((orig_title or "").lower() in t_lower and len(orig_title or "") > 3)
        if not has_match:
            has_match = any(w in v_clean for w in s_words) or any(w in v_clean for w in orig_words)
        if not has_match and (s_words or orig_words):
            return {
                "badge": "⚪️ [ДРУГОЙ ФИЛЬМ / СЕРИАЛ]",
                "rank": 5,
                "is_junk": True,
                "note": "Название не совпадает с запрашиваемым сериалом"
            }

    # 4. Full season compilation
    is_full_season = bool(re.search(r'(?:все\s*серии|весь\s*сезон|сезон\s*целиком|\d+-\d+\s*сери[яи])', title, re.I)) or duration_sec > 10800
    if is_full_season:
        s_match = re.search(r'(?:s0*(\d{1,2})|\b(\d{1,2})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))', title, re.I)
        fs = int(s_match.group(1) or s_match.group(2) or s_match.group(3)) if s_match else target_season
        if target_season is None or fs is None or fs == target_season:
            return {
                "badge": f"🔵 [ВЕСЬ СЕЗОН: S{fs or 1}]",
                "rank": 85,
                "is_junk": False,
                "note": "📦 Сборник: все серии сезона подряд"
            }

    # 5. Exact episode matching
    if is_series and target_episode is not None:
        found_season = None
        found_episode = None
        m_x = re.search(r'\b0*(\d{1,2})[xх]0*(\d{1,3})\b', title, re.I)
        if m_x:
            found_season = int(m_x.group(1))
            found_episode = int(m_x.group(2))
        else:
            m_s = re.search(r'(?:s0*(\d{1,2})|\b(\d{1,2})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))', title, re.I)
            if m_s:
                found_season = int(m_s.group(1) or m_s.group(2) or m_s.group(3))
            m_e = re.search(r'(?:e0*(\d{1,3})|\b(\d{1,3})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|серия|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*(\d{1,3}))', title, re.I)
            if m_e:
                found_episode = int(m_e.group(1) or m_e.group(2) or m_e.group(3))

        if found_episode is not None:
            season_ok = (target_season is None or found_season is None or found_season == target_season)
            if found_episode == target_episode and season_ok:
                return {
                    "badge": f"🟢 [СЕРИЯ НАЙДЕНА: S{found_season or target_season} E{found_episode}]",
                    "rank": 100,
                    "is_junk": False,
                    "note": "✅ Запрошенная серия"
                }
            else:
                return {
                    "badge": f"⚪️ [ДРУГАЯ СЕРИЯ: S{found_season or '?'} E{found_episode}]",
                    "rank": 30,
                    "is_junk": False,
                    "note": f"⚠️ Чужая серия (запрошена {target_episode})"
                }

        return {
            "badge": "⚪️ [БЕЗ НОМЕРА СЕРИИ]",
            "rank": 50,
            "is_junk": False,
            "note": ""
        }

    return {
        "badge": "🎬 [ВИДЕО]",
        "rank": 60,
        "is_junk": False,
        "note": ""
    }

async def _perform_online_search(fetch_fn, query: str, season: Optional[int] = None, episode: Optional[int] = None, limit: int = 25):
    raw_query = query
    if season is None:
        m_s = re.search(r'(?:s0*(\d{1,2})|\b(\d{1,2})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))', raw_query, re.I)
        if m_s:
            season = int(m_s.group(1) or m_s.group(2) or m_s.group(3))
    if episode is None:
        m_e = re.search(r'(?:e0*(\d{1,3})|\b(\d{1,3})\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|серия|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*(\d{1,3}))', raw_query, re.I)
        if m_e:
            episode = int(m_e.group(1) or m_e.group(2) or m_e.group(3))

    clean_base = re.sub(r'(?:s0*\d{1,2}|\b\d{1,2}\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*\d{1,2})', '', raw_query, flags=re.I)
    clean_base = re.sub(r'(?:e0*\d{1,3}|\b\d{1,3}\s*(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|серия|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*\d{1,3})', '', clean_base, flags=re.I)
    clean_base = re.sub(r'\s+(?:19|20)\d{2}$', '', clean_base).strip()
    clean_base = re.sub(r'[\s._-]+', ' ', clean_base).strip()

    from backend.metadata import resolve_movie_online
    online_info = await resolve_movie_online(clean_base or query)
    ru_title = online_info.get("ru_title") or clean_base or query
    orig_title = online_info.get("orig_title")

    search_terms = []
    if season is not None and episode is not None:
        search_terms.append(f"{ru_title} {season} сезон {episode} серия")
        search_terms.append(f"{ru_title} {episode} серия")
        if orig_title:
            search_terms.append(f"{orig_title} S{season:02d}E{episode:02d}")
        search_terms.append(f"{ru_title} {season} сезон")
    elif season is not None:
        search_terms.append(f"{ru_title} {season} сезон")
        if orig_title:
            search_terms.append(f"{orig_title} Season {season}")
    if ru_title not in search_terms:
        search_terms.append(ru_title)
    if query not in search_terms:
        search_terms.append(query)

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, fetch_fn, t, limit) for t in search_terms[:3]]
    batches = await asyncio.gather(*tasks, return_exceptions=True)

    seen_ids = set()
    raw_results = []
    for b in batches:
        if isinstance(b, list):
            for item in b:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    raw_results.append(item)

    is_series = bool(season is not None or episode is not None)
    classified = []
    has_valid = False
    for it in raw_results:
        cls_info = classify_online_video(
            it["title"],
            it.get("duration_str", ""),
            season,
            episode,
            show_title=ru_title,
            orig_title=orig_title,
            is_series=is_series
        )
        item_copy = dict(it)
        item_copy.update(cls_info)
        item_copy["duration_sec"] = parse_duration_sec(it.get("duration_str", ""))
        classified.append(item_copy)
        if cls_info["rank"] >= 30:
            has_valid = True

    if has_valid:
        classified = [x for x in classified if not x.get("is_junk") and x["rank"] > 15]

    classified.sort(key=lambda x: (x["rank"], x["duration_sec"]), reverse=True)
    return classified[:limit]

@app.get("/api/online/vk")
async def api_online_vk(
    query: str = Query(...),
    season: Optional[int] = Query(None),
    episode: Optional[int] = Query(None),
    limit: int = 25
):
    return await _perform_online_search(search_vk_video, query, season, episode, limit)

@app.get("/api/online/vk/stream")
async def api_online_vk_stream(id: str = Query(...)):
    stream = get_vk_stream(id)
    if not stream:
        raise HTTPException(status_code=404, detail="Не удалось извлечь видеопоток VK")
    return stream

@app.get("/api/online/rutube")
async def api_online_rutube(
    query: str = Query(...),
    season: Optional[int] = Query(None),
    episode: Optional[int] = Query(None),
    limit: int = 25
):
    return await _perform_online_search(search_rutube, query, season, episode, limit)

@app.get("/api/online/rutube/stream")
async def api_online_rutube_stream(id: str = Query(...)):
    stream = get_rutube_stream(id)
    if not stream:
        raise HTTPException(status_code=404, detail="Видео недоступно на Rutube (заблокировано правообладателем или удалено)")
    return stream

@app.get("/api/online/search")
async def api_online_combined_search(
    query: str = Query(...),
    season: Optional[int] = Query(None),
    episode: Optional[int] = Query(None),
    limit: int = 20
):
    """
    Simultaneously searches VK Video and Rutube with episode matching and ranking.
    """
    vk_future = _perform_online_search(search_vk_video, query, season, episode, limit)
    rutube_future = _perform_online_search(search_rutube, query, season, episode, limit)
    vk_res, rutube_res = await asyncio.gather(vk_future, rutube_future, return_exceptions=True)
    
    vk_items = vk_res if isinstance(vk_res, list) else []
    rutube_items = rutube_res if isinstance(rutube_res, list) else []
    
    return {
        "vk": vk_items,
        "rutube": rutube_items,
        "total": len(vk_items) + len(rutube_items)
    }


@app.api_route("/api/online/proxy_stream", methods=["GET", "HEAD"])
def api_online_proxy_stream(url: str = Query(...), request: Request = None):
    """
    Direct-interface streaming proxy for VK Video and Rutube.
    Routes media traffic through physical Russian network interface (bypassing VPN),
    providing full HTTP 206 Partial Content (Range) support for seamless player seeking.
    """
    import requests
    from requests.adapters import HTTPAdapter

    direct_ip = None
    try:
        from backend.torrserver import get_physical_net_info
        iface, direct_ip, gw = get_physical_net_info()
    except Exception:
        pass

    session = requests.Session()
    if direct_ip:
        class _SourceAddressAdapter(HTTPAdapter):
            def __init__(self, source_address, **kwargs):
                self.source_address = source_address
                super().__init__(**kwargs)
            def init_poolmanager(self, *args, **kwargs):
                kwargs['source_address'] = self.source_address
                return super().init_poolmanager(*args, **kwargs)

        adapter = _SourceAddressAdapter((direct_ip, 0))
        session.mount('https://', adapter)
        session.mount('http://', adapter)

    req_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://vk.com/" if ("vk" in url or "okcdn" in url) else "https://rutube.ru/"
    }
    if request and "range" in request.headers:
        req_headers["Range"] = request.headers["range"]

    try:
        upstream_resp = session.get(url, headers=req_headers, stream=True, timeout=20)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy upstream connection error: {e}")

    content_type = upstream_resp.headers.get("Content-Type", "")
    is_m3u8 = ".m3u8" in url or "mpegurl" in content_type.lower() or "application/x-mpegurl" in content_type.lower()

    if is_m3u8 and upstream_resp.status_code == 200:
        raw_text = upstream_resp.text
        lines = raw_text.splitlines()
        out_lines = []
        base_proxy = f"{request.base_url}api/online/proxy_stream?url=" if (request and getattr(request, 'base_url', None)) else "http://127.0.0.1:7890/api/online/proxy_stream?url="
        for line in lines:
            sline = line.strip()
            if not sline:
                out_lines.append(line)
                continue
            if sline.startswith("#"):
                # Rewrite URI in tags like #EXT-X-KEY or #EXT-X-MAP
                def repl_uri(m):
                    u = m.group(1)
                    abs_u = urllib.parse.urljoin(url, u)
                    prox = f"{base_proxy}{urllib.parse.quote(abs_u, safe='')}"
                    return f'URI="{prox}"'
                sline = re.sub(r'URI="([^"]+)"', repl_uri, sline)
                out_lines.append(sline)
            else:
                abs_u = urllib.parse.urljoin(url, sline)
                prox = f"{base_proxy}{urllib.parse.quote(abs_u, safe='')}"
                out_lines.append(prox)
        rewritten = "\n".join(out_lines).encode("utf-8")
        resp_headers = {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Content-Length": str(len(rewritten)),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "no-cache"
        }
        return Response(content=rewritten, status_code=200, headers=resp_headers, media_type="application/vnd.apple.mpegurl")

    response_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    }
    for h in ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"]:
        if h in upstream_resp.headers:
            response_headers[h] = upstream_resp.headers[h]

    def iter_content():
        try:
            for chunk in upstream_resp.iter_content(chunk_size=256 * 1024):
                if chunk:
                    yield chunk
        finally:
            upstream_resp.close()

    return StreamingResponse(
        iter_content(),
        status_code=upstream_resp.status_code,
        headers=response_headers,
        media_type=upstream_resp.headers.get("Content-Type", "video/mp4")
    )

@app.get("/lampa")
async def lampa_proxy():
    direct_ip = None
    try:
        from backend.torrserver import get_physical_net_info
        iface, direct_ip, gw = get_physical_net_info()
    except Exception:
        pass

    cmd = ["curl", "-s", "--connect-timeout", "5", "http://lampa.mx"]
    if direct_ip:
        cmd.extend(["--interface", direct_ip])

    res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
    html = res.stdout if (res.returncode == 0 and res.stdout) else "<html><head></head><body></body></html>"

    if "<head>" in html:
        html = html.replace("<head>", '<head>\n<base href="http://lampa.mx/">')

    plugin_scripts = """
    <script>
      (function() {
        var defaultPlugins = [
          "http://127.0.0.1:7890/plugins/kinoflix_all.js",
          "http://127.0.0.1:7890/plugins/community/online_mod.js",
          "http://127.0.0.1:7890/plugins/community/modss_online.js",
          "http://127.0.0.1:7890/plugins/community/lampaplugins_store.js",
          "http://127.0.0.1:7890/plugins/community/cub_etor.js",
          "http://127.0.0.1:7890/plugins/community/cub_iptv.js"
        ];
        try {
          var saved = localStorage.getItem('plugins');
          saved = saved ? JSON.parse(saved) : [];
          if (!Array.isArray(saved)) saved = [];
          var urls = saved.map(function(p) { return typeof p === 'string' ? p : p.url; });
          var mod = false;
          defaultPlugins.forEach(function(u) {
            if (urls.indexOf(u) === -1) {
              saved.push({ url: u, status: 1 });
              mod = true;
            }
          });
          if (mod) localStorage.setItem('plugins', JSON.stringify(saved));
        } catch(e) { console.error('Plugins setup error:', e); }
      })();
    </script>
    <script src="http://127.0.0.1:7890/plugins/kinoflix_all.js"></script>
    <script src="http://127.0.0.1:7890/plugins/community/online_mod.js"></script>
    <script src="http://127.0.0.1:7890/plugins/community/modss_online.js"></script>
    <script src="http://127.0.0.1:7890/plugins/community/lampaplugins_store.js"></script>
    <script src="http://127.0.0.1:7890/plugins/community/cub_etor.js"></script>
    <script src="http://127.0.0.1:7890/plugins/community/cub_iptv.js"></script>
    """
    if "</body>" in html:
        html = html.replace("</body>", plugin_scripts + "\n</body>")
    else:
        html += plugin_scripts

    return HTMLResponse(content=html)

# Mount Lampa plugins
if os.path.exists(PLUGINS_DIR):
    app.mount("/plugins", StaticFiles(directory=PLUGINS_DIR), name="plugins")

# Mount static frontend
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


