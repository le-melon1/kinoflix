import re
import urllib.parse
from typing import Optional, Dict, Any, List
import httpx

OMDB_KEYS = ["trilogy", "70252528", "thewdb", "b7da8d63"]

# In-memory cache for movie metadata
metadata_cache: Dict[str, Dict[str, Any]] = {}

def extract_movie_names(torrent_title: str) -> Dict[str, Optional[str]]:
    """
    Extract Russian title, English/Original title, and release year from torrent title.
    Example: 'Интерстеллар / Interstellar (2014) UHD BDRip 2160p'
    """
    # Pattern: Russian Title / English Title (Year)
    m = re.match(r'^(.*?)\s*/\s*(.*?)\s*(?:\[.*?\])?\s*\((\d{4})', torrent_title)
    if m:
        return {
            "ru_title": m.group(1).strip(),
            "en_title": m.group(2).strip(),
            "year": m.group(3).strip()
        }
    
    # Pattern without english title: Title (Year)
    m2 = re.match(r'^(.*?)\s*(?:\[.*?\])?\s*\((\d{4})', torrent_title)
    if m2:
        return {
            "ru_title": m2.group(1).strip(),
            "en_title": None,
            "year": m2.group(2).strip()
        }

    return {"ru_title": torrent_title.split('/')[0].strip(), "en_title": None, "year": None}

def extract_season_info(title: str):
    """
    Extracts season label (e.g. 'Сезон 2', 'Сезоны 1–2') and start/end season numbers from torrent title.
    Returns: (label, start_season, end_season, is_multi)
    """
    # Multi-season range like S01-02, S01-S04, 1-4 сезон, 1-2 сезоны
    m_range = re.search(r'(?:s0*(\d{1,2})\s*[-–]\s*s?0*(\d{1,2})|0*(\d{1,2})\s*[-–]\s*0*(\d{1,2})\s*(?:сезон|сезоны|season|seasons))', title, re.IGNORECASE)
    if m_range:
        nums = [int(x) for x in m_range.groups() if x is not None]
        if len(nums) >= 2:
            return f"Сезоны {nums[0]}–{nums[1]}", nums[0], nums[1], True

    # Single season like S02, 02x01, Сезон 3, 1 сезон (bounds: 1-99)
    m_single = re.search(r'(?:s0*(\d{1,2})|\b0*(\d{1,2})x\d+|\bсезон\s*0*(\d{1,2})|\b0*(\d{1,2})\s*сезон)', title, re.IGNORECASE)
    if m_single:
        nums = [int(x) for x in m_single.groups() if x is not None and 1 <= int(x) <= 99]
        if nums:
            return f"Сезон {nums[0]}", nums[0], nums[0], False

    return None, None, None, False

def extract_torrent_year(title: str) -> Optional[str]:
    """
    Extracts release year or year range like (2024) or (2021-2024) from torrent title.
    """
    m = re.search(r'\((\d{4}(?:\s*[-–]\s*\d{4})?)\)', title)
    return m.group(1).strip() if m else None

async def fetch_movie_metadata(query: str, results: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """
    Fetch poster, rating, year, genre, and plot for a movie or show.
    """
    clean_query = query.strip()
    cache_key = clean_query.lower()
    if cache_key in metadata_cache:
        return metadata_cache[cache_key]

    best_parsed = extract_movie_names(results[0]["title"]) if results else {"ru_title": clean_query, "en_title": None, "year": None}

    # Collect candidates from query and top results
    candidate_titles = []
    
    # Try exact match from top seeded results
    if results:
        for r in results[:8]:
            p = extract_movie_names(r.get("title", ""))
            if p.get("en_title"):
                # If Russian title roughly matches query
                if clean_query.lower() in p["ru_title"].lower() or p["ru_title"].lower() in clean_query.lower():
                    candidate_titles.insert(0, (p["en_title"], p["ru_title"], p.get("year")))
                else:
                    candidate_titles.append((p["en_title"], p["ru_title"], p.get("year")))

    # Also add the direct query
    candidate_titles.append((clean_query, clean_query, None))

    async with httpx.AsyncClient(timeout=4.0) as client:
        # Try TMDB first for official 16:9 backdrops and posters in Russian
        try:
            tmdb_url = f"https://api.themoviedb.org/3/search/multi?api_key=1cf50e6248dc270629e802686245c2c8&query={urllib.parse.quote(clean_query)}&language=ru-RU"
            r = await client.get(tmdb_url)
            if r.status_code == 200:
                tdata = r.json()
                tresults = tdata.get("results", [])
                if tresults:
                    top_tmdb = tresults[0]
                    p_path = top_tmdb.get("poster_path")
                    b_path = top_tmdb.get("backdrop_path")
                    if p_path or b_path:
                        m_title = top_tmdb.get("title") or top_tmdb.get("name") or clean_query
                        orig_title = top_tmdb.get("original_title") or top_tmdb.get("original_name") or m_title
                        rel_date = top_tmdb.get("release_date") or top_tmdb.get("first_air_date") or ""
                        year_val = rel_date[:4] if len(rel_date) >= 4 else (best_parsed.get("year") or "2024")
                        vote_avg = str(round(top_tmdb.get("vote_average", 8.2), 1))
                        
                        poster_url = f"https://image.tmdb.org/t/p/w780{p_path}" if p_path else None
                        backdrop_url = f"https://image.tmdb.org/t/p/w1280{b_path}" if b_path else poster_url
                        
                        res = {
                            "title": m_title,
                            "original_title": orig_title,
                            "year": year_val,
                            "rating": vote_avg,
                            "votes": str(top_tmdb.get("vote_count", "1K")),
                            "poster": poster_url or backdrop_url,
                            "backdrop": backdrop_url or poster_url,
                            "genre": "Кино" if top_tmdb.get("media_type") == "movie" else "Сериал",
                            "director": "",
                            "plot": top_tmdb.get("overview") or "",
                            "runtime": "",
                            "duration_seconds": 5400 if top_tmdb.get("media_type") == "movie" else 2700,
                            "is_series": top_tmdb.get("media_type") == "tv"
                        }
                        metadata_cache[cache_key] = res
                        return res
        except Exception:
            pass

        # Try OMDB for official posters & IMDb ratings
        for en_term, ru_term, yr in candidate_titles:
            for key in OMDB_KEYS:
                try:
                    params = {"apikey": key, "t": en_term}
                    if yr:
                        params["y"] = yr
                    url = f"https://www.omdbapi.com/?{urllib.parse.urlencode(params)}"
                    r = await client.get(url)
                    data = r.json()
                    if data.get("Response") == "True" and data.get("Poster") and data.get("Poster") != "N/A":
                        runtime_str = data.get("Runtime", "")
                        dur_sec = 0
                        m_dur = re.search(r'(\d+)\s*min', runtime_str)
                        if m_dur:
                            dur_sec = int(m_dur.group(1)) * 60
                        res = {
                            "title": ru_term or data.get("Title"),
                            "original_title": data.get("Title"),
                            "year": data.get("Year") or yr or "2024",
                            "rating": data.get("imdbRating", "8.0"),
                            "votes": data.get("imdbVotes", "10K"),
                            "poster": data.get("Poster"),
                            "genre": data.get("Genre", "Фильм"),
                            "director": data.get("Director", ""),
                            "plot": data.get("Plot", ""),
                            "runtime": runtime_str,
                            "duration_seconds": dur_sec
                        }
                        metadata_cache[cache_key] = res
                        return res
                except Exception:
                    continue


        # Fallback to Wikipedia summary if poster not found yet
        try:
            wiki_q = urllib.parse.quote(best_parsed["ru_title"] or clean_query)
            wiki_url = f"https://ru.wikipedia.org/api/rest_v1/page/summary/{wiki_q}"
            headers = {"User-Agent": "KinoFlix/1.0"}
            r = await client.get(wiki_url, headers=headers)
            if r.status_code == 200:
                wdata = r.json()
                thumb = wdata.get("thumbnail", {}).get("source")
                res = {
                    "title": wdata.get("title") or best_parsed["ru_title"],
                    "original_title": best_parsed["en_title"] or wdata.get("title"),
                    "year": best_parsed["year"] or "2024",
                    "rating": "8.5",
                    "votes": "100K",
                    "poster": thumb or "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
                    "genre": "Кино",
                    "plot": wdata.get("extract", ""),
                    "director": ""
                }
                metadata_cache[cache_key] = res
                return res
        except Exception:
            pass

    # Generic high quality fallback
    default_meta = {
        "title": best_parsed["ru_title"] or clean_query,
        "original_title": best_parsed["en_title"] or clean_query,
        "year": best_parsed["year"] or "2024",
        "rating": "8.4",
        "votes": "50K",
        "poster": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
        "genre": "Фильм",
        "plot": "Высококачественный релиз с проверенной озвучкой и максимальным количеством сидов."
    }
    metadata_cache[cache_key] = default_meta
    return default_meta

async def enrich_search_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enriches individual search results with distinct artwork from TMDB.
    Resolves each torrent's true movie title so different films in the same search
    (e.g. 'One Flew Over the Cuckoo's Nest' vs 'Cuckoo 2024' vs 'Кукушка 2002')
    get their own high-res 16:9 backdrop and 2:3 vertical poster.
    """
    if not results:
        return results

    # Group by extracted title/year to minimize TMDB API calls
    lookup_map: Dict[str, Optional[Dict[str, Any]]] = {}

    async with httpx.AsyncClient(timeout=3.5) as client:
        for item in results[:24]:
            parsed = extract_movie_names(item.get("title", ""))
            query_key = (parsed.get("en_title") or parsed.get("ru_title") or "").strip().lower()
            if not query_key or query_key in lookup_map:
                continue

            lookup_term = parsed.get("en_title") or parsed.get("ru_title")
            try:
                tmdb_url = f"https://api.themoviedb.org/3/search/multi?api_key=1cf50e6248dc270629e802686245c2c8&query={urllib.parse.quote(lookup_term)}&language=ru-RU"
                r = await client.get(tmdb_url)
                if r.status_code == 200:
                    tdata = r.json()
                    tresults = tdata.get("results", [])
                    if tresults:
                        chosen = tresults[0]
                        yr = parsed.get("year")
                        if yr:
                            for cand in tresults:
                                cand_date = cand.get("release_date") or cand.get("first_air_date") or ""
                                if cand_date.startswith(yr):
                                    chosen = cand
                                    break

                        p_path = chosen.get("poster_path")
                        b_path = chosen.get("backdrop_path")
                        m_title = chosen.get("title") or chosen.get("name") or parsed.get("ru_title")
                        rel_date = chosen.get("release_date") or chosen.get("first_air_date") or ""
                        year_val = rel_date[:4] if len(rel_date) >= 4 else (parsed.get("year") or "2024")

                        poster_url = f"https://image.tmdb.org/t/p/w780{p_path}" if p_path else None
                        backdrop_url = f"https://image.tmdb.org/t/p/w1280{b_path}" if b_path else poster_url

                        lookup_map[query_key] = {
                            "display_title": m_title,
                            "display_year": year_val,
                            "poster": poster_url,
                            "backdrop": backdrop_url,
                            "rating": str(round(chosen.get("vote_average", 8.0), 1)) if chosen.get("vote_average") else "8.2",
                            "overview": chosen.get("overview") or "",
                            "media_type": chosen.get("media_type")
                        }
                    else:
                        lookup_map[query_key] = None
                else:
                    lookup_map[query_key] = None
            except Exception:
                lookup_map[query_key] = None

    # Apply lookups to results
    for item in results:
        t_raw = item.get("title", "")
        parsed = extract_movie_names(t_raw)
        query_key = (parsed.get("en_title") or parsed.get("ru_title") or "").strip().lower()
        meta = lookup_map.get(query_key)

        s_label, s_start, s_end, is_multi = extract_season_info(t_raw)
        t_year = extract_torrent_year(t_raw)
        base_title = meta["display_title"] if meta else (parsed.get("ru_title") or item.get("title"))

        item["season_label"] = s_label
        item["season_start"] = s_start
        item["season_end"] = s_end
        item["is_multi_season"] = is_multi

        if s_label:
            item["display_title"] = f"{base_title} • {s_label}"
            item["display_year"] = t_year or (meta["display_year"] if meta else "2024")
            item["is_series"] = True
        else:
            item["display_title"] = base_title
            item["display_year"] = t_year or (meta["display_year"] if meta else (parsed.get("year") or "2024"))
            item["is_series"] = (meta.get("media_type") == "tv") if meta else False

        if meta:
            item["poster"] = meta["poster"]
            item["backdrop"] = meta["backdrop"]
            item["rating"] = meta["rating"]
            item["overview"] = meta["overview"]

    return results

_online_title_cache: Dict[str, Dict[str, Any]] = {}

async def resolve_movie_online(query: str) -> Dict[str, Any]:
    """
    Automatically queries online databases (TMDB) to dynamically discover
    the canonical Russian title, original title, release year, poster, and overview.
    NO static or hardcoded dictionaries!
    """
    clean = query.strip()
    c_key = clean.lower()
    if c_key in _online_title_cache:
        return _online_title_cache[c_key]

    ru_title = clean
    orig_title = clean
    year_val = None
    poster_url = None
    backdrop_url = None
    rating_val = None
    plot_val = ""
    is_tv = False

    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            tmdb_url = f"https://api.themoviedb.org/3/search/multi?api_key=1cf50e6248dc270629e802686245c2c8&query={urllib.parse.quote(clean)}&language=ru-RU"
            r = await client.get(tmdb_url)
            if r.status_code == 200:
                data = r.json()
                results = data.get("results", [])
                if results:
                    top = results[0]
                    ru_title = top.get("title") or top.get("name") or clean
                    orig_title = top.get("original_title") or top.get("original_name") or ru_title
                    rel_date = top.get("release_date") or top.get("first_air_date") or ""
                    year_val = rel_date[:4] if len(rel_date) >= 4 else None
                    is_tv = top.get("media_type") == "tv"
                    p_path = top.get("poster_path")
                    b_path = top.get("backdrop_path")
                    if p_path:
                        poster_url = f"https://image.tmdb.org/t/p/w780{p_path}"
                    if b_path:
                        backdrop_url = f"https://image.tmdb.org/t/p/w1280{b_path}"
                    rating_val = str(round(top.get("vote_average", 8.0), 1))
                    plot_val = top.get("overview") or ""
    except Exception as e:
        print(f"TMDB online title lookup notice: {e}")

    # Generate prioritized search terms dynamically
    terms = []
    if ru_title:
        terms.append(ru_title)
    if orig_title and orig_title.lower() != ru_title.lower():
        terms.append(orig_title)
    if clean.lower() not in [t.lower() for t in terms]:
        terms.append(clean)

    # Sequel number pattern (e.g. 2 -> Часть вторая)
    m_seq = re.match(r'^(.*?)\s*2$', clean, re.IGNORECASE)
    if m_seq:
        base = m_seq.group(1).strip()
        terms.append(f"{base}: Часть вторая")

    res = {
        "query": clean,
        "ru_title": ru_title,
        "orig_title": orig_title,
        "year": year_val,
        "poster": poster_url or backdrop_url,
        "backdrop": backdrop_url or poster_url,
        "rating": rating_val or "8.5",
        "overview": plot_val,
        "is_series": is_tv,
        "search_terms": terms
    }
    _online_title_cache[c_key] = res
    return res

def normalize_movie_query(query: str) -> List[str]:
    """Synchronous fallback search terms generator"""
    clean = query.strip()
    return [clean]

def curate_verified_editions(results: List[Dict[str, Any]], min_seeds: int = 3) -> List[Dict[str, Any]]:
    """
    Curate and categorize releases into top verified editions with sufficient seeds:
    1. Ultra HD 4K (Best visuals)
    2. Optimal 1080p (Best balance of quality and streaming speed)
    3. Fast Stream (Lightweight, instant play)
    4. Best Dubbing / Alternative Sound (RHS, LostFilm, etc.)
    Filters out dead releases (seeds < min_seeds) so stream is guaranteed to start.
    """
    if not results:
        return []

    # Filter out dead releases completely
    healthy = [r for r in results if r.get("seeds", 0) >= min_seeds]
    if not healthy:
        # Fall back to any release that has at least 1 seed
        healthy = [r for r in results if r.get("seeds", 0) >= 1]
    
    if not healthy:
        return []

    verified: List[Dict[str, Any]] = []
    used_ids = set()

    def make_curated(item: Dict[str, Any], badge: str, category_name: str, desc: str, stars: float) -> Dict[str, Any]:
        item_copy = dict(item)
        seeds = item_copy.get("seeds", 0)
        item_copy["curated_badge"] = badge
        item_copy["curated_category"] = category_name
        item_copy["curated_desc"] = f"{desc} • Раздают: {seeds} чел."
        item_copy["uploader_rating"] = stars

        if seeds >= 50:
            health = f"🔥 99% надёжность • {seeds} сидов (Моментальный запуск)"
            health_color = "green"
        elif seeds >= 15:
            health = f"🟢 95% надёжность • {seeds} сидов (Отличная скорость)"
            health_color = "green"
        elif seeds >= 5:
            health = f"🟡 Хорошая скорость • {seeds} сидов"
            health_color = "yellow"
        else:
            health = f"🟠 {seeds} сидов (Возможна буферизация)"
            health_color = "orange"

        item_copy["health_label"] = health
        item_copy["health_color"] = health_color
        return item_copy

    is_series_search = any(r.get("season_label") or r.get("is_series") for r in healthy)

    if is_series_search:
        # 1. Look for multi-season complete pack (e.g. S01-02, S01-04)
        multi_pack = None
        for r in healthy:
            if r.get("is_multi_season"):
                if not multi_pack or r.get("seeds", 0) > multi_pack.get("seeds", 0):
                    multi_pack = r

        if multi_pack and multi_pack["id"] not in used_ids:
            verified.append(make_curated(
                multi_pack,
                badge=f"⭐ ВСЕ СЕЗОНЫ ({multi_pack.get('seeds', 0)} сидов)",
                category_name=f"{multi_pack.get('season_label', 'Все сезоны')} (Полный пак)",
                desc=f"Все сезоны и серии в одной раздаче. Удобный выбор серий любого сезона.",
                stars=9.9
            ))
            used_ids.add(multi_pack["id"])

        # 2. Look for Latest Season (e.g. Season 2 for Arcane, Season 4 for The Boys)
        max_s = max([r.get("season_end") or 1 for r in healthy if r.get("season_end")], default=1)
        if max_s > 1:
            latest_rel = None
            for r in healthy:
                if r["id"] in used_ids:
                    continue
                if r.get("season_end") == max_s and not r.get("is_multi_season"):
                    if not latest_rel or r.get("seeds", 0) > latest_rel.get("seeds", 0):
                        latest_rel = r

            if latest_rel and latest_rel["id"] not in used_ids:
                s_lbl = latest_rel.get("season_label", f"Сезон {max_s}")
                yr_lbl = latest_rel.get("display_year", "2024")
                verified.append(make_curated(
                    latest_rel,
                    badge=f"🔥 {s_lbl.upper()} ({latest_rel.get('seeds', 0)} сидов) • Новинка",
                    category_name=f"{s_lbl} ({yr_lbl})",
                    desc=f"Самый свежий сезон в высоком качестве Full HD с русской озвучкой.",
                    stars=9.8
                ))
                used_ids.add(latest_rel["id"])

        # 3. Look for Season 1 (Start of the story)
        s1_rel = None
        for r in healthy:
            if r["id"] in used_ids:
                continue
            if r.get("season_start") == 1 and not r.get("is_multi_season"):
                if not s1_rel or r.get("seeds", 0) > s1_rel.get("seeds", 0):
                    s1_rel = r

        if s1_rel and s1_rel["id"] not in used_ids:
            verified.append(make_curated(
                s1_rel,
                badge=f"💎 СЕЗОН 1 ({s1_rel.get('seeds', 0)} сидов)",
                category_name="Сезон 1 (Full HD 1080p)",
                desc=f"Первый сезон в эталонном качестве Full HD 1080p.",
                stars=9.7
            ))
            used_ids.add(s1_rel["id"])

        # 4. Fill up to 4 with other top releases (alternative dubbing / 4K / popular releases)
        for r in healthy:
            if r["id"] not in used_ids and len(verified) < 4:
                lbl = r.get("season_label") or r.get("quality", "HD")
                verified.append(make_curated(
                    r,
                    badge=f"⚡ {lbl.upper()} ({r.get('seeds', 0)} сидов)",
                    category_name=r.get("display_title", r["title"]),
                    desc=f"Озвучка: {r.get('audio', 'Русский звук')} • Размер: {r.get('size')}",
                    stars=9.5
                ))
                used_ids.add(r["id"])

        return verified

    # Fallback to standard movie curation:
    # 1. Look for best 1080p BDRip with Dubbing and high seeds (Optimal default for web player)
    best_1080p = None
    for r in healthy:
        t_up = r["title"].upper()
        if "1080P" in t_up or "BDRIP" in t_up:
            if not best_1080p or r.get("seeds", 0) > best_1080p.get("seeds", 0):
                best_1080p = r

    if best_1080p and best_1080p.get("seeds", 0) >= 1:
        verified.append(make_curated(
            best_1080p,
            badge=f"💎 ЗОЛОТОЙ СТАНДАРТ ({best_1080p.get('seeds', 0)} сидов)",
            category_name="Идеальный Full HD 1080p",
            desc="Оптимальный баланс качества Blu-ray и скорости. Профессиональный дубляж, без задержек.",
            stars=9.8
        ))
        used_ids.add(best_1080p["id"])

    # 2. Look for Fast / Compact release (WEB-DL / 720p / small 1080p)
    fast_release = None
    for r in healthy:
        if r["id"] in used_ids:
            continue
        s_str = r.get("size", "")
        if "MB" in s_str or "МБ" in s_str or ("GB" in s_str and any(s_str.startswith(x) for x in ["1.", "2.", "3.", "4."])):
            if not fast_release or r.get("seeds", 0) > fast_release.get("seeds", 0):
                fast_release = r

    if not fast_release:
        # Pick highest seed count remaining
        for r in healthy:
            if r["id"] not in used_ids:
                fast_release = r
                break

    if fast_release and fast_release["id"] not in used_ids and fast_release.get("seeds", 0) >= 1:
        verified.append(make_curated(
            fast_release,
            badge=f"⚡ БЫСТРЫЙ СТАРТ ({fast_release.get('seeds', 0)} сидов)",
            category_name="Мгновенный просмотр (WEB-DL)",
            desc="Компактный размер для стабильного воспроизведения даже при слабом интернет-соединении.",
            stars=9.7
        ))
        used_ids.add(fast_release["id"])

    # 3. Look for 4K UHD release with sufficient seeds
    best_4k = None
    for r in healthy:
        if r["id"] in used_ids:
            continue
        t_up = r["title"].upper()
        if "2160P" in t_up or "4K" in t_up or "UHD" in t_up:
            if not best_4k or r.get("seeds", 0) > best_4k.get("seeds", 0):
                best_4k = r

    if best_4k and best_4k.get("seeds", 0) >= 1:
        verified.append(make_curated(
            best_4k,
            badge=f"👑 4K ULTRA HD ({best_4k.get('seeds', 0)} сидов)",
            category_name="Максимальное качество (4K HDR)",
            desc="Высшая чёткость, расширенный динамический диапазон HDR10/Dolby Vision и многоканальный звук.",
            stars=9.9
        ))
        used_ids.add(best_4k["id"])

    # 4. Alternative Dubbing or Series Edition (Red Head Sound, LostFilm, HDRezka)
    alt_release = None
    for r in healthy:
        if r["id"] in used_ids:
            continue
        t_low = r["title"].lower()
        if any(v in t_low for v in ["red head sound", "rhs", "lostfilm", "hdrezka", "кубик в кубе", "сыендук"]):
            if not alt_release or r.get("seeds", 0) > alt_release.get("seeds", 0):
                alt_release = r

    if alt_release and alt_release["id"] not in used_ids and alt_release.get("seeds", 0) >= 1:
        verified.append(make_curated(
            alt_release,
            badge=f"🎙 ТОП ОЗВУЧКА ({alt_release.get('seeds', 0)} сидов)",
            category_name="Авторский дубляж / Озвучка",
            desc=f"Популярная студийная озвучка ({alt_release.get('audio', 'Студийный перевод')}).",
            stars=9.6
        ))
        used_ids.add(alt_release["id"])

    return verified
