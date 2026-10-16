import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import json
import os
import socket

CONFIG_FILE = os.path.expanduser("~/.config/kinoflix/rutracker.json")

def is_port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False

def detect_best_proxy() -> Optional[str]:
    """Auto-detect active local VPN/proxy like v2RayTun or Clash or NekoRay"""
    # 1. v2RayTun HTTP proxy
    if is_port_open("127.0.0.1", 10809):
        return "http://127.0.0.1:10809"
    # 2. v2RayTun / Shadowsocks SOCKS5 proxy
    if is_port_open("127.0.0.1", 10808):
        return "socks5://127.0.0.1:10808"
    # 3. Clash / Mihomo proxy
    if is_port_open("127.0.0.1", 7891):
        return "socks5://127.0.0.1:7891"
    # 4. NekoRay / Xray HTTP proxy
    if is_port_open("127.0.0.1", 2081):
        return "http://127.0.0.1:2081"
    # 5. Generic SOCKS5
    if is_port_open("127.0.0.1", 1080):
        return "socks5://127.0.0.1:1080"
    return None

class RuTrackerClient:
    def __init__(self):
        self.base_url = "https://rutracker.net/forum"
        self.alt_url = "https://rutracker.org/forum"
        self.cookies: Dict[str, str] = {}
        self.username: Optional[str] = None
        self.custom_proxy: Optional[str] = None
        self.is_logged_in: bool = False
        self.load_config()

    def get_proxy(self) -> Optional[str]:
        if self.custom_proxy:
            return self.custom_proxy
        return detect_best_proxy()

    def get_client(self, timeout: float = 10.0) -> httpx.AsyncClient:
        proxy = self.get_proxy()
        if proxy:
            return httpx.AsyncClient(proxy=proxy, timeout=timeout, follow_redirects=True)
        return httpx.AsyncClient(timeout=timeout, follow_redirects=True)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.cookies = data.get("cookies", {})
                    self.username = data.get("username")
                    self.custom_proxy = data.get("custom_proxy")
                    self.is_logged_in = bool(self.cookies.get("bb_session"))
            except Exception:
                pass

    def save_config(self):
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "cookies": self.cookies,
                "username": self.username,
                "custom_proxy": self.custom_proxy
            }, f, indent=2)

    def set_cookie_string(self, cookie_str: str, username: Optional[str] = None) -> bool:
        """Parse cookie header string (e.g. bb_session=...; bb_ssl=1)"""
        parsed = {}
        for part in cookie_str.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                parsed[k] = v
        if "bb_session" in parsed:
            self.cookies = parsed
            self.username = username or "Пользователь RuTracker"
            self.is_logged_in = True
            self.save_config()
            return True
        return False

    async def login(self, username: str, password: str) -> Dict[str, Any]:
        """Log in to RuTracker using credentials via VPN/proxy"""
        login_url = f"{self.base_url}/login.php"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": f"{self.base_url}/index.php",
        }
        data = {
            "login_username": username,
            "login_password": password,
            "login": "%C2%F5%EE%E4"  # "Вход" in cp1251
        }
        
        try:
            async with self.get_client(timeout=12.0) as client:
                resp = await client.post(login_url, headers=headers, data=data)
                new_cookies = dict(resp.cookies)
                if "bb_session" in new_cookies:
                    self.cookies = new_cookies
                    self.username = username
                    self.is_logged_in = True
                    self.save_config()
                    return {"success": True, "username": username}
                
                html_text = resp.content.decode("cp1251", errors="ignore")
                if "logged-in-username" in html_text:
                    self.cookies = new_cookies
                    self.username = username
                    self.is_logged_in = True
                    self.save_config()
                    return {"success": True, "username": username}
                
                error_match = re.search(r'<h4[^>]*class="warnColor1[^"]*"[^>]*>(.*?)</h4>', html_text)
                err_msg = error_match.group(1).strip() if error_match else "Неверный логин или пароль, либо требуется капча"
                return {"success": False, "error": err_msg}
        except Exception as e:
            return {"success": False, "error": f"Ошибка сети при обращении к RuTracker: {str(e)}"}

    async def check_session(self) -> Dict[str, Any]:
        """Check if current session is active"""
        proxy = self.get_proxy()
        proxy_label = f"Через прокси/VPN ({proxy})" if proxy else "Через системный VPN"
        
        if not self.cookies or "bb_session" not in self.cookies:
            return {"authenticated": False, "proxy": proxy, "proxy_label": proxy_label}
        
        url = f"{self.base_url}/index.php"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Cookie": "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        }
        try:
            async with self.get_client(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                text = resp.content.decode("cp1251", errors="ignore")
                is_auth = "logged-in-username" in text or "logout" in text
                self.is_logged_in = is_auth
                return {
                    "authenticated": is_auth,
                    "username": self.username or "Пользователь RuTracker",
                    "proxy": proxy,
                    "proxy_label": proxy_label
                }
        except Exception:
            return {
                "authenticated": self.is_logged_in,
                "username": self.username,
                "proxy": proxy,
                "proxy_label": proxy_label
            }

    async def search(self, query: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Search RuTracker forum tracker via VPN/proxy"""
        if not self.cookies:
            return []

        try:
            query_cp1251 = query.encode("cp1251")
            encoded_query = urllib.parse.quote(query_cp1251)
        except Exception:
            encoded_query = urllib.parse.quote(query)

        search_url = f"{self.base_url}/tracker.php?nm={encoded_query}&o=10&s=2"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Referer": f"{self.base_url}/tracker.php",
            "Cookie": "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        }

        results: List[Dict[str, Any]] = []
        try:
            async with self.get_client(timeout=10.0) as client:
                resp = await client.get(search_url, headers=headers)
                if resp.status_code != 200:
                    return []
                
                html = resp.content.decode("cp1251", errors="ignore")
                soup = BeautifulSoup(html, "html.parser")
                table = soup.find("table", id="tor-tbl")
                if not table:
                    return []

                rows = table.find_all("tr", class_=re.compile(r"hl-tr"))
                for row in rows:
                    t_title_td = row.find("td", class_="t-title")
                    if not t_title_td:
                        continue
                    
                    link_a = t_title_td.find("a", class_="tLink")
                    if not link_a:
                        continue
                    
                    full_title = link_a.get_text(strip=True)
                    topic_id_match = re.search(r'viewtopic\.php\?t=(\d+)', link_a.get("href", ""))
                    if not topic_id_match:
                        continue
                    topic_id = topic_id_match.group(1)

                    cat_td = row.find("td", class_="f-name")
                    category = cat_td.get_text(strip=True) if cat_td else "Видео"

                    size_td = row.find("td", class_="tor-size")
                    size_str = size_td.get_text(strip=True) if size_td else "N/A"
                    size_str = re.sub(r'[\r\n\t]+', ' ', size_str).strip()

                    seed_td = row.find("td", class_=re.compile(r"seedmed|u-seed"))
                    seeds = 0
                    if seed_td:
                        s_text = seed_td.get_text(strip=True).replace("&nbsp;", "")
                        num_m = re.search(r'(\d+)', s_text)
                        if num_m:
                            seeds = int(num_m.group(1))

                    leech_td = row.find("td", class_=re.compile(r"leechmed"))
                    leeches = 0
                    if leech_td:
                        l_text = leech_td.get_text(strip=True).replace("&nbsp;", "")
                        num_l = re.search(r'(\d+)', l_text)
                        if num_l:
                            leeches = int(num_l.group(1))

                    if seeds < 1:
                        continue

                    from backend.rutor import parse_quality, parse_audio
                    quality = parse_quality(full_title)
                    audio = parse_audio(full_title)


                    results.append({
                        "id": f"rutracker_{topic_id}",
                        "source": "RuTracker",
                        "title": full_title,
                        "topic_id": topic_id,
                        "category": category,
                        "size": size_str,
                        "seeds": seeds,
                        "leeches": leeches,
                        "quality": quality,
                        "audio": audio,
                        "details_url": f"{self.base_url}/viewtopic.php?t={topic_id}",
                        "download_url": f"/api/rutracker/download/{topic_id}"
                    })
                    if len(results) >= limit:
                        break

        except Exception as e:
            print(f"RuTracker search error: {e}")

        return results

    async def get_topic_magnet(self, topic_id: str) -> Optional[str]:
        """Fetch topic page via VPN/proxy and extract magnet link"""
        url = f"{self.base_url}/viewtopic.php?t={topic_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Cookie": "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        }
        try:
            async with self.get_client(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                html = resp.content.decode("cp1251", errors="ignore")
                magnet_match = re.search(r'href="(magnet:\?xt=[^"]+)"', html)
                if magnet_match:
                    return magnet_match.group(1)
        except Exception as e:
            print(f"Error fetching topic magnet: {e}")
        return None

    async def download_torrent_file(self, topic_id: str) -> Optional[bytes]:
        """Download .torrent bytes from dl.php via VPN/proxy"""
        url = f"{self.base_url}/dl.php?t={topic_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Referer": f"{self.base_url}/viewtopic.php?t={topic_id}",
            "Cookie": "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        }
        try:
            async with self.get_client(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and resp.content.startswith(b"d8:announce"):
                    return resp.content
        except Exception as e:
            print(f"Error downloading torrent: {e}")
        return None

rutracker_client = RuTrackerClient()
