import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx

RUTOR_MIRRORS = [
    "http://rutor.info",
    "http://rutor.is",
    "https://rutor.is"
]

RUSSIAN_PUBLIC_TRACKERS = [
    "http://bt.t-ru.org/ann?magnet",
    "http://bt2.t-ru.org/ann?magnet",
    "http://bt3.t-ru.org/ann?magnet",
    "http://bt4.t-ru.org/ann?magnet",
    "http://retracker.local/announce",
    "http://opentor.net:6969/announce",
    "udp://opentor.net:6969",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.openbittorrent.com:6969/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://explodie.org:6969/announce",
    "udp://tracker.cyberia.is:6969/announce",
    "udp://tracker.dler.org:6969/announce",
    "udp://tracker.tiny-vps.com:6969/announce"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

def enrich_magnet_trackers(magnet: str) -> str:
    """Appends reliable Russian HTTP and UDP announce trackers to any magnet link"""
    if not magnet or not magnet.startswith("magnet:?"):
        return magnet
    for tr in RUSSIAN_PUBLIC_TRACKERS:
        if tr not in magnet:
            magnet += f"&tr={tr}"
    return magnet

def format_bytes_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{round(size_bytes / (1024 * 1024 * 1024), 2)} GB"
    elif size_bytes >= 1024 * 1024:
        return f"{round(size_bytes / (1024 * 1024), 1)} MB"
    return f"{size_bytes} B"

def parse_quality(title: str) -> str:
    title_upper = title.upper()
    if "2160P" in title_upper or "4K" in title_upper or "UHD" in title_upper:
        return "4K UHD"
    if "1080P" in title_upper or "1080I" in title_upper:
        return "1080p"
    if "720P" in title_upper:
        return "720p"
    if "BDRIP" in title_upper or "BLURAY" in title_upper:
        return "BDRip"
    if "WEB-DL" in title_upper or "WEBRIP" in title_upper:
        return "WEB-DL"
    if "DVDRIP" in title_upper:
        return "DVDRip"
    return "HD"

def parse_audio(title: str) -> str:
    title_lower = title.lower()
    audios = []
    if "дублирован" in title_lower or "дубляж" in title_lower or " | d |" in title_lower or " | d," in title_lower or " d " in title_lower:
        audios.append("Дубляж")
    if "red head sound" in title_lower or "rhs" in title_lower:
        audios.append("Red Head Sound")
    if "hdrezka" in title_lower or "rezka" in title_lower:
        audios.append("HDRezka")
    if "lostfilm" in title_lower:
        audios.append("LostFilm")
    if "кубик в кубе" in title_lower:
        audios.append("Кубик в Кубе")
    if "многоголос" in title_lower or " | p |" in title_lower or " | p," in title_lower:
        audios.append("MVO")
    if "оригинал" in title_lower or "sub" in title_lower or "субтитр" in title_lower:
        audios.append("Субтитры")
    return ", ".join(audios) if audios else "Русский звук"

async def search_torrents_csv(query: str, limit: int = 30, min_seeds: int = 1) -> List[Dict[str, Any]]:
    """
    Search Torrents-CSV public API (unblocked global torrent index).
    Works in Russia without VPN via physical adapter binding.
    """
    from backend.metadata import get_direct_client
    results: List[Dict[str, Any]] = []
    encoded = urllib.parse.quote(query)
    url = f"https://torrents-csv.com/service/search?q={encoded}"
    trackers_suffix = "&tr=" + "&tr=".join(RUSSIAN_PUBLIC_TRACKERS)

    try:
        async with get_direct_client(timeout=3.5) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                data = resp.json()
                for t in data.get("torrents", []):
                    seeds = int(t.get("seeders") or 0)
                    if seeds < min_seeds:
                        continue
                    ih = (t.get("infohash") or "").lower().strip()
                    if not ih:
                        continue
                    name = t.get("name") or "Video"
                    magnet = f"magnet:?xt=urn:btih:{ih}&dn={urllib.parse.quote(name)}{trackers_suffix}"
                    size_b = int(t.get("size_bytes") or 0)
                    results.append({
                        "id": f"tcsv_{ih[:16]}",
                        "source": "Torrents-CSV",
                        "title": name,
                        "magnet": magnet,
                        "torrent_url": f"https://itorrents.org/torrent/{ih}.torrent",
                        "size": format_bytes_size(size_b),
                        "seeds": seeds,
                        "leeches": int(t.get("leechers") or 0),
                        "date": "",
                        "quality": parse_quality(name),
                        "audio": parse_audio(name),
                        "details_url": ""
                    })
                    if len(results) >= limit:
                        break
    except Exception:
        pass
    return results

async def search_apibay(query: str, limit: int = 30, min_seeds: int = 1) -> List[Dict[str, Any]]:
    """
    Search PirateBay via public apibay.org API.
    Works in Russia without VPN.
    """
    from backend.metadata import get_direct_client
    results: List[Dict[str, Any]] = []
    encoded = urllib.parse.quote(query)
    url = f"https://apibay.org/q.php?q={encoded}"
    trackers_suffix = "&tr=" + "&tr=".join(RUSSIAN_PUBLIC_TRACKERS)

    try:
        async with get_direct_client(timeout=3.5) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                data = resp.json()
                for t in data:
                    name = t.get("name") or ""
                    if name == "No results returned":
                        continue
                    seeds = int(t.get("seeders") or 0)
                    if seeds < min_seeds:
                        continue
                    ih = (t.get("info_hash") or "").lower().strip()
                    if not ih or ih == "0000000000000000000000000000000000000000":
                        continue
                    magnet = f"magnet:?xt=urn:btih:{ih}&dn={urllib.parse.quote(name)}{trackers_suffix}"
                    size_b = int(t.get("size") or 0)
                    results.append({
                        "id": f"apibay_{ih[:16]}",
                        "source": "ThePirateBay",
                        "title": name,
                        "magnet": magnet,
                        "torrent_url": f"https://itorrents.org/torrent/{ih}.torrent",
                        "size": format_bytes_size(size_b),
                        "seeds": seeds,
                        "leeches": int(t.get("leechers") or 0),
                        "date": "",
                        "quality": parse_quality(name),
                        "audio": parse_audio(name),
                        "details_url": ""
                    })
                    if len(results) >= limit:
                        break
    except Exception:
        pass
    return results

async def search_rutor(query: str, limit: int = 40, min_seeds: int = 2) -> List[Dict[str, Any]]:
    """
    Search Rutor sorted strictly by seeders descending.
    Filters out dead torrents so stream always works.
    Strictly bypasses VPN using direct adapter binding and fallback to Torrents-CSV / Apibay.
    """
    clean_q = re.sub(r'[:"\'!@#$%^&*()_+=\[\]]', ' ', query).strip()
    clean_q = re.sub(r'\s+', ' ', clean_q)
    encoded_query = urllib.parse.quote(clean_q or query)
    results: List[Dict[str, Any]] = []

    from backend.metadata import get_direct_client
    async with get_direct_client(timeout=1.2) as client:
        for mirror in RUTOR_MIRRORS:
            # Formula: /search/0/0/000/2/query sorts by seeds descending
            url = f"{mirror}/search/0/0/000/2/{encoded_query}"
            try:
                resp = await client.get(url, headers=HEADERS)
                if resp.status_code == 200 and "index" in resp.text:
                    html = resp.text

                    row_chunks = re.findall(r'<tr class="(?:gai|tum)">.*?</tr>', html, re.DOTALL)
                    for chunk in row_chunks:
                        mag_m = re.search(r'href="(magnet:\?xt=[^"]+)"', chunk)
                        if not mag_m:
                            continue
                        magnet = enrich_magnet_trackers(mag_m.group(1))

                        title_m = re.search(r'<a href="/torrent/(\d+)/[^"]*">([^<]+)</a>', chunk)
                        if not title_m:
                            continue
                        torrent_id = title_m.group(1)
                        import html as html_lib
                        full_title = html_lib.unescape(title_m.group(2).strip())

                        size_m = re.search(r'<td align="right">([^<]+)</td>', chunk)
                        size_str = size_m.group(1).replace("&nbsp;", " ").strip() if size_m else "N/A"

                        # Parse seeds from <span class="green"><img ... />&nbsp;XX</span>
                        span_green = re.search(r'<span class="green">(.*?)</span>', chunk)
                        seeds = 0
                        if span_green:
                            s_clean = span_green.group(1).replace("&nbsp;", "")
                            num_m = re.search(r'(\d+)', s_clean)
                            if num_m:
                                seeds = int(num_m.group(1))

                        # Parse leeches
                        span_red = re.search(r'<span class="red">(.*?)</span>', chunk)
                        leech = 0
                        if span_red:
                            l_clean = span_red.group(1).replace("&nbsp;", "")
                            num_l = re.search(r'(\d+)', l_clean)
                            if num_l:
                                leech = int(num_l.group(1))

                        # Skip releases with no seeds for streaming
                        if seeds < min_seeds:
                            continue

                        date_m = re.search(r'<td>(\d{1,2}\s+[А-Яа-яA-Za-z]{3}\s+\d{2})</td>', chunk)
                        date_str = date_m.group(1).replace("&nbsp;", " ") if date_m else ""

                        quality = parse_quality(full_title)
                        audio = parse_audio(full_title)

                        results.append({
                            "id": f"rutor_{torrent_id}",
                            "source": "Rutor",
                            "title": full_title,
                            "magnet": magnet,
                            "torrent_url": f"{mirror}/download/{torrent_id}",
                            "size": size_str,
                            "seeds": seeds,
                            "leeches": leech,
                            "date": date_str,
                            "quality": quality,
                            "audio": audio,
                            "details_url": f"{mirror}/torrent/{torrent_id}"
                        })

                        if len(results) >= limit:
                            break

                    if results:
                        return results
            except Exception:
                # If direct IP connection times out or fails, remaining mirrors share the same IP pool
                break

    # Fallback to Torrents-CSV and Apibay if Rutor yielded no results
    if not results:
        csv_results = await search_torrents_csv(clean_q or query, limit=limit, min_seeds=min_seeds)
        if csv_results:
            results.extend(csv_results)
        if len(results) < limit:
            apibay_results = await search_apibay(clean_q or query, limit=limit - len(results), min_seeds=min_seeds)
            results.extend(apibay_results)

    return results
