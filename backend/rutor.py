import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx

RUTOR_MIRRORS = [
    "http://rutor.info",
    "http://rutor.is",
    "https://torrsearch.rutor.info"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

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

async def search_rutor(query: str, limit: int = 40, min_seeds: int = 2) -> List[Dict[str, Any]]:
    """
    Search Rutor sorted strictly by seeders descending.
    Filters out dead torrents so stream always works.
    """
    encoded_query = urllib.parse.quote(query)
    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
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
                        magnet = mag_m.group(1)

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
            except Exception as e:
                continue

    return results
