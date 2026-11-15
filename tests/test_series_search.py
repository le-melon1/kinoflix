import unittest
from backend.metadata import extract_movie_names
from backend.torrserver import parse_series_episodes, select_video_files


class SeriesSearchTests(unittest.TestCase):
    def test_scene_names_collapse_to_one_series(self):
        titles = [
            'Cyberpunk.Edgerunners.S02.1080p.NF.WEB-DL',
            'Cyberpunk Edgerunners S02E02 1080p WEB',
            'Cyberpunk - Edgerunners - S01 - DUAL 1080p WEB',
            'Cyberpunk Edgerunners Season 1 1080p',
        ]
        self.assertEqual({extract_movie_names(t)['ru_title'] for t in titles}, {'Cyberpunk Edgerunners'})

    def test_anime_numbered_files_are_episodes(self):
        files = [{'id': n, 'path': f'Anime - {n:02}.mkv', 'is_video': True,
                  'size_bytes': 100000000, 'size_mb': 100} for n in (2, 1, 3)]
        videos, is_series = select_video_files(files)
        self.assertTrue(is_series)
        episodes = parse_series_episodes(videos)['1']
        self.assertEqual([e['episode'] for e in episodes], [1, 2, 3])
        self.assertEqual([e['id'] for e in episodes], [1, 2, 3])


if __name__ == '__main__':
    unittest.main()

class VideoProbeTests(unittest.TestCase):
    def test_probe_failure_does_not_assume_h264(self):
        from unittest.mock import patch
        from backend.torrserver import probe_media_tracks
        with patch('backend.torrserver.httpx.post', side_effect=OSError('offline')), \
             patch('backend.torrserver.subprocess.check_output', side_effect=OSError('missing ffprobe')):
            result = probe_media_tracks('missing_probe_test', 1)
        self.assertEqual(result['video_codec'], 'unknown')
        self.assertEqual(result['height'], 0)
