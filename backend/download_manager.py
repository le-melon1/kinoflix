import os
import sys
import time
import json
import asyncio
import re
import urllib.parse
from typing import Optional, Dict, Any, List
import httpx

from backend.torrserver import torrserver_mgr, TORRSERVER_URL
from backend.rutracker import rutracker_client

DOWNLOADS_DIR = os.path.expanduser("~/Downloads/KinoFlix")
META_FILE = os.path.expanduser("~/.config/kinoflix/downloads_meta.json")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(META_FILE), exist_ok=True)

class DownloadTask:
    def __init__(
        self,
        task_id: str,
        torrent_hash: str,
        file_id: int,
        filename: str,
        title: str,
        poster: str = "",
        total_bytes: int = 0,
        magnet: str = "",
        topic_id: Optional[int] = None,
        target_dir: Optional[str] = None
    ):
        self.task_id = task_id
        self.torrent_hash = torrent_hash
        self.file_id = file_id
        self.filename = filename
        self.title = title
        self.poster = poster
        self.total_bytes = total_bytes
        self.downloaded_bytes = 0
        self.magnet = magnet
        self.topic_id = topic_id
        self.speed_bps = 0
        self.speed_str = "0 МБ/с"
        self.eta_seconds = 0
        self.eta_str = ""
        self.progress = 0.0
        self.status = "downloading"  # "downloading", "completed", "error", "canceled"
        self.error: Optional[str] = None
        self.cancel_requested = False
        self.created_at = time.time()
        self.worker_task: Optional[asyncio.Task] = None
        self.target_dir = target_dir or DOWNLOADS_DIR

    @property
    def target_path(self) -> str:
        return os.path.join(self.target_dir, self.filename)

    @property
    def part_path(self) -> str:
        return self.target_path + ".part"

    def to_dict(self) -> Dict[str, Any]:
        dl_mb = round(self.downloaded_bytes / (1024 * 1024), 1)
        tot_mb = round(self.total_bytes / (1024 * 1024), 1) if self.total_bytes > 0 else 0
        
        dl_str = f"{dl_mb} МБ" if dl_mb < 1024 else f"{round(dl_mb/1024, 2)} ГБ"
        tot_str = f"{tot_mb} МБ" if tot_mb < 1024 else f"{round(tot_mb/1024, 2)} ГБ"

        return {
            "id": self.task_id,
            "title": self.title,
            "filename": self.filename,
            "torrent_hash": self.torrent_hash,
            "file_id": self.file_id,
            "poster": self.poster,
            "progress": round(self.progress, 1),
            "downloaded_bytes": self.downloaded_bytes,
            "downloaded_str": dl_str,
            "total_bytes": self.total_bytes,
            "total_str": tot_str,
            "speed_bps": self.speed_bps,
            "speed_str": self.speed_str,
            "eta_seconds": self.eta_seconds,
            "eta_str": self.eta_str,
            "status": self.status,
            "error": self.error,
            "is_complete": self.status == "completed",
            "created_at": self.created_at
        }

class DownloadManager:
    def __init__(self):
        self.tasks: Dict[str, DownloadTask] = {}
        self._meta_cache: Dict[str, Any] = self._load_meta()
        self._downloads_dir = DOWNLOADS_DIR

    @property
    def downloads_dir(self) -> str:
        return self._downloads_dir

    @downloads_dir.setter
    def downloads_dir(self, val: str):
        if val and isinstance(val, str):
            expanded = os.path.expanduser(val.strip())
            os.makedirs(expanded, exist_ok=True)
            self._downloads_dir = expanded

    def _load_meta(self) -> Dict[str, Any]:
        if os.path.exists(META_FILE):
            try:
                with open(META_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_meta(self):
        try:
            with open(META_FILE, "w", encoding="utf-8") as f:
                json.dump(self._meta_cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving download meta: {e}")

    async def start_download(
        self,
        torrent_hash: Optional[str] = None,
        file_id: int = 1,
        filename: Optional[str] = None,
        title: Optional[str] = None,
        poster: str = "",
        magnet: Optional[str] = None,
        topic_id: Optional[int] = None
    ) -> Dict[str, Any]:
        os.makedirs(self.downloads_dir, exist_ok=True)
        raw_title = title or "movie"
        safe_base = re.sub(r'[\\/*?:"<>|]', "_", raw_title).strip()
        safe_name = filename or f"{safe_base}.mp4"
        if not any(safe_name.lower().endswith(ext) for ext in [".mp4", ".mkv", ".avi", ".ts"]):
            safe_name += ".mp4"

        target_path = os.path.join(self.downloads_dir, safe_name)
        if os.path.exists(target_path):
            if os.path.getsize(target_path) > 1024 * 1024:
                return {
                    "status": "already_exists",
                    "filename": safe_name,
                    "title": raw_title,
                    "message": "Файл уже скачан на диск"
                }
            else:
                try:
                    os.remove(target_path)
                except Exception:
                    pass

        # Check if already active
        for task in self.tasks.values():
            if task.filename == safe_name and task.status == "downloading":
                return {
                    "status": "already_downloading",
                    "task": task.to_dict(),
                    "message": "Загрузка уже идёт"
                }

        # If hash is missing or not yet in TorrServer, resolve it
        effective_hash = torrent_hash
        effective_file_id = file_id or 1
        total_file_bytes = 0

        # Try magnet or topic_id if hash is absent
        if not effective_hash or len(effective_hash) < 10:
            eff_magnet = magnet
            if not eff_magnet and topic_id:
                eff_magnet = await rutracker_client.get_topic_magnet(topic_id)
            if eff_magnet:
                info = await torrserver_mgr.add_torrent(eff_magnet, title=raw_title)
                effective_hash = info.get("hash")
                effective_file_id = info.get("default_index") or 1

        # Query TorrServer for exact file size and info
        if effective_hash:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    r = await client.post(
                        f"{TORRSERVER_URL}/torrents",
                        json={"action": "get", "hash": effective_hash}
                    )
                    t_info = r.json()
                    file_stats = t_info.get("file_stats", [])
                    for fs in file_stats:
                        if fs.get("id") == effective_file_id:
                            total_file_bytes = fs.get("length", 0)
                            fs_path = fs.get("path", "")
                            ext = os.path.splitext(fs_path)[1]
                            if ext and not safe_name.lower().endswith(ext.lower()):
                                safe_name = f"{safe_base}{ext}"
                            break
                    if total_file_bytes == 0 and file_stats:
                        # Pick largest video file
                        video_files = [f for f in file_stats if any(f.get("path", "").lower().endswith(e) for e in [".mkv", ".mp4", ".avi", ".ts"])]
                        if video_files:
                            video_files.sort(key=lambda x: x.get("length", 0), reverse=True)
                            effective_file_id = video_files[0].get("id", 1)
                            total_file_bytes = video_files[0].get("length", 0)
                            ext = os.path.splitext(video_files[0].get("path", ""))[1]
                            if ext:
                                safe_name = f"{safe_base}{ext}"
            except Exception as e:
                print(f"Could not fetch file_stats from TorrServer: {e}")

        task_id = safe_name
        task = DownloadTask(
            task_id=task_id,
            torrent_hash=effective_hash or "",
            file_id=effective_file_id,
            filename=safe_name,
            title=raw_title,
            poster=poster,
            total_bytes=total_file_bytes,
            magnet=magnet or "",
            topic_id=topic_id,
            target_dir=self.downloads_dir
        )

        self.tasks[task_id] = task

        # Persist metadata
        self._meta_cache[safe_name] = {
            "title": raw_title,
            "filename": safe_name,
            "torrent_hash": effective_hash,
            "file_id": effective_file_id,
            "poster": poster,
            "total_bytes": total_file_bytes,
            "magnet": magnet,
            "topic_id": topic_id
        }
        self._save_meta()

        # Launch background continuous worker
        task.worker_task = asyncio.create_task(self._download_worker(task))

        return {
            "status": "started",
            "task": task.to_dict(),
            "message": f"Загрузка фильма «{raw_title}» началась"
        }

    async def _download_worker(self, task: DownloadTask):
        """
        Continuously and relentlessly downloads the file until 100% complete.
        Supports automatic reconnection and resumption using HTTP Range requests.
        """
        stream_url = (
            f"{TORRSERVER_URL}/stream/{urllib.parse.quote(task.filename)}"
            f"?link={task.torrent_hash}&index={task.file_id}&play"
        )

        last_time = time.time()
        last_bytes = os.path.getsize(task.part_path) if os.path.exists(task.part_path) else 0

        retry_count = 0
        while not task.cancel_requested:
            current_pos = os.path.getsize(task.part_path) if os.path.exists(task.part_path) else 0
            task.downloaded_bytes = current_pos

            if task.total_bytes > 0:
                task.progress = round(min(100.0, (current_pos / task.total_bytes) * 100), 1)
                if current_pos >= task.total_bytes:
                    task.status = "completed"
                    task.progress = 100.0
                    task.speed_str = "0 МБ/с"
                    task.eta_str = ""
                    if os.path.exists(task.part_path):
                        os.rename(task.part_path, task.target_path)
                    print(f"Download completed successfully: {task.target_path}")
                    break

            headers = {}
            if current_pos > 0:
                headers["Range"] = f"bytes={current_pos}-"

            try:
                # 30 second read timeout; if no chunk received, it automatically reconnects
                timeout = httpx.Timeout(connect=15.0, read=30.0, write=15.0, pool=None)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    async with client.stream("GET", stream_url, headers=headers) as resp:
                        if resp.status_code not in (200, 206):
                            await asyncio.sleep(2.0)
                            retry_count += 1
                            continue

                        # Read total size from Content-Range or Content-Length
                        if task.total_bytes <= 0:
                            cr = resp.headers.get("content-range")
                            if cr and "/" in cr:
                                try:
                                    task.total_bytes = int(cr.split("/")[-1])
                                except Exception:
                                    pass
                            if task.total_bytes <= 0:
                                cl = resp.headers.get("content-length")
                                if cl:
                                    task.total_bytes = current_pos + int(cl)

                        with open(task.part_path, "ab" if current_pos > 0 else "wb") as f:
                            async for chunk in resp.aiter_bytes(chunk_size=512 * 1024):
                                if task.cancel_requested:
                                    break
                                f.write(chunk)
                                current_pos += len(chunk)
                                task.downloaded_bytes = current_pos

                                if task.total_bytes > 0:
                                    task.progress = round(min(100.0, (current_pos / task.total_bytes) * 100), 1)

                                now = time.time()
                                dt = now - last_time
                                if dt >= 1.0:
                                    diff = current_pos - last_bytes
                                    task.speed_bps = int(diff / dt)
                                    mb_s = round(task.speed_bps / (1024 * 1024), 1)
                                    task.speed_str = f"{mb_s} МБ/с" if mb_s >= 0.1 else f"{round(task.speed_bps / 1024)} КБ/с"

                                    if task.speed_bps > 0 and task.total_bytes > current_pos:
                                        rem = task.total_bytes - current_pos
                                        task.eta_seconds = int(rem / task.speed_bps)
                                        if task.eta_seconds < 60:
                                            task.eta_str = f"{task.eta_seconds} сек"
                                        elif task.eta_seconds < 3600:
                                            task.eta_str = f"{int(task.eta_seconds / 60)} мин"
                                        else:
                                            task.eta_str = f"{round(task.eta_seconds / 3600, 1)} ч"
                                    last_bytes = current_pos
                                    last_time = now

                # Verify if complete
                if task.total_bytes > 0 and current_pos >= task.total_bytes:
                    task.status = "completed"
                    task.progress = 100.0
                    task.downloaded_bytes = task.total_bytes
                    task.speed_str = "0 МБ/с"
                    task.eta_str = ""
                    if os.path.exists(task.part_path):
                        os.rename(task.part_path, task.target_path)
                    print(f"Download finished: {task.target_path}")
                    break

            except asyncio.CancelledError:
                break
            except Exception as e:
                # Connection glitch or TorrServer buffer pause; wait 2s and resume
                await asyncio.sleep(2.0)
                retry_count += 1
                task.speed_str = "Буферизация..."

        if task.cancel_requested:
            task.status = "canceled"
            if os.path.exists(task.part_path):
                try:
                    os.remove(task.part_path)
                except Exception:
                    pass

    async def cancel_download(self, filename: str) -> bool:
        safe_name = os.path.basename(filename)
        task = self.tasks.get(safe_name)
        if task:
            task.cancel_requested = True
            if task.worker_task and not task.worker_task.done():
                task.worker_task.cancel()
            task.status = "canceled"
            del self.tasks[safe_name]
        part_path = os.path.join(self.downloads_dir, safe_name + ".part")
        if os.path.exists(part_path):
            try:
                os.remove(part_path)
            except Exception:
                pass
        return True

    async def delete_download(self, filename: str) -> bool:
        await self.cancel_download(filename)
        safe_name = os.path.basename(filename)
        target = os.path.join(self.downloads_dir, safe_name)
        deleted = False
        if os.path.exists(target):
            try:
                os.remove(target)
                deleted = True
            except Exception:
                pass
        if safe_name in self._meta_cache:
            del self._meta_cache[safe_name]
            self._save_meta()
        return deleted

    def get_status_payload(self) -> Dict[str, Any]:
        os.makedirs(self.downloads_dir, exist_ok=True)
        active_list = []
        completed_items = []

        # 1. Active downloads
        for task in list(self.tasks.values()):
            if task.status == "downloading":
                active_list.append(task.to_dict())

        # 2. Files on disk
        try:
            for fname in os.listdir(self.downloads_dir):
                if fname.startswith("."):
                    continue
                fpath = os.path.join(self.downloads_dir, fname)
                if not os.path.isfile(fpath):
                    continue

                if fname.endswith(".part"):
                    # Ongoing download file
                    clean_name = fname[:-5]
                    # If not currently tracked in self.tasks, attempt to resume it
                    if clean_name not in self.tasks:
                        meta = self._meta_cache.get(clean_name, {})
                        if meta and meta.get("torrent_hash"):
                            asyncio.create_task(
                                self.start_download(
                                    torrent_hash=meta.get("torrent_hash"),
                                    file_id=meta.get("file_id", 1),
                                    filename=clean_name,
                                    title=meta.get("title", clean_name.rsplit(".", 1)[0]),
                                    poster=meta.get("poster", ""),
                                    magnet=meta.get("magnet"),
                                    topic_id=meta.get("topic_id")
                                )
                            )
                    continue

                st = os.stat(fpath)
                if st.st_size < 1024:
                    try:
                        os.remove(fpath)
                    except Exception:
                        pass
                    continue
                size_mb = round(st.st_size / (1024 * 1024), 1)
                size_str = f"{size_mb} МБ" if size_mb < 1024 else f"{round(size_mb / 1024, 2)} ГБ"
                meta = self._meta_cache.get(fname, {})
                title = meta.get("title") or fname.rsplit(".", 1)[0]
                poster = meta.get("poster", "")

                completed_items.append({
                    "filename": fname,
                    "title": title,
                    "poster": poster,
                    "size_mb": size_mb,
                    "size_str": size_str,
                    "path": fpath,
                    "mtime": st.st_mtime,
                    "stream_url": f"/api/downloads/play/{urllib.parse.quote(fname)}",
                    "is_complete": True
                })
            completed_items.sort(key=lambda x: x["mtime"], reverse=True)
        except Exception as e:
            print(f"Error reading downloads directory: {e}")

        return {
            "downloads_dir": self.downloads_dir,
            "active": active_list,
            "items": completed_items
        }

download_mgr = DownloadManager()
