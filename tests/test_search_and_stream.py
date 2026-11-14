import unittest
from unittest.mock import AsyncMock, patch

from fastapi import BackgroundTasks, HTTPException
from backend import main
from backend.metadata import extract_movie_names, extract_torrent_year
from backend.rutor import is_non_video_release, parse_audio
from backend.torrserver import TorrServerManager, select_video_files


class SearchMetadataTests(unittest.TestCase):
    def test_release_metadata(self):
        self.assertEqual(extract_movie_names('Интерстеллар.2014.UHD.mkv')['year'], '2014')
        self.assertEqual(extract_torrent_year('Интерстеллар.2014.UHD.mkv'), '2014')
        self.assertTrue(is_non_video_release('The Martian by Andy Weir EPUB'))
        self.assertTrue(is_non_video_release('The Martian audiobook.mp3'))
        self.assertFalse(is_non_video_release('The Martian 2015 1080p AAC'))
        self.assertEqual(parse_audio('The Martian (2015)'), 'Озвучка неизвестна')

    def test_release_ranking_prefers_compatible_format_with_similar_seeds(self):
        compatible = {'title': 'Movie 1080p x264', 'seeds': 50}
        heavy = {'title': 'Movie 2160p x265 REMUX', 'seeds': 55}
        self.assertGreater(main.playback_score(compatible), main.playback_score(heavy))
        self.assertGreater(main.playback_score({'title': 'Movie 1080p x264', 'seeds': 50}),
                           main.playback_score({'title': 'Movie 1080p x264', 'seeds': 2}))

    def test_magnet_identity_ignores_other_parameters(self):
        a = {'id': 'a', 'magnet': 'magnet:?xt=urn:btih:ABC123&dn=one'}
        b = {'id': 'b', 'magnet': 'magnet:?xt=urn:btih:abc123&dn=two'}
        self.assertEqual(main.release_identity(a), main.release_identity(b))

    def test_search_relevance_respects_title_boundary(self):
        self.assertTrue(main.title_matches_search({'title': 'Arrival 2016 1080p'}, ['Arrival']))
        self.assertTrue(main.title_matches_search({'title': 'The Arrival (1996)'}, ['Arrival']))
        self.assertFalse(main.title_matches_search({'title': 'The White Lotus S01E01 Arrivals'}, ['Arrival']))
        self.assertFalse(main.title_matches_search({'title': 'A New Arrival in Space'}, ['Arrival']))

    def test_main_movie_not_trailer_and_series_episodes(self):
        movie = [{'path': 'movie.mkv', 'is_video': True, 'size_bytes': 1000},
                 {'path': 'trailer.mp4', 'is_video': True, 'size_bytes': 20}]
        selected, series = select_video_files(movie)
        self.assertFalse(series)
        self.assertEqual(selected[0]['path'], 'movie.mkv')
        episodes = [{'path': 'Show.S01E01.mkv', 'is_video': True, 'size_bytes': 1000},
                    {'path': 'Show.S01E02.mkv', 'is_video': True, 'size_bytes': 900},
                    {'path': 'trailer.mp4', 'is_video': True, 'size_bytes': 10}]
        selected, series = select_video_files(episodes)
        self.assertTrue(series)
        self.assertEqual(len(selected), 2)

    def test_existing_external_server_is_not_stopped(self):
        manager = TorrServerManager()
        with patch.object(manager, 'is_running', return_value=True), \
             patch.object(manager, 'stop') as stop, \
             patch('backend.torrserver.get_physical_net_info', return_value=('en0', '192.0.2.1', None)):
            manager.start()
            self.assertIsNone(manager.process)
            stop.assert_not_called()
        with patch.object(manager, 'drop_all_torrents') as drop:
            manager.stop()
            drop.assert_not_called()


class StreamRequestTests(unittest.IsolatedAsyncioTestCase):
    async def test_selected_topic_does_not_fall_back_to_another_release(self):
        req = main.StreamPrepareRequest(topic_id='123', title='Test')
        with patch.object(main.rutracker_client, 'get_topic_magnet', new=AsyncMock(return_value=None)), \
             patch.object(main.torrserver_mgr, 'add_torrent', new=AsyncMock()) as add:
            for handler in (main.prepare_stream, main.preload_stream):
                with self.assertRaises(HTTPException) as error:
                    await handler(req, BackgroundTasks())
                self.assertEqual(error.exception.status_code, 400)
            add.assert_not_called()

    async def test_search_uses_canonical_year_instead_of_unrelated_result(self):
        movie = {'ru_title': 'Интерстеллар', 'orig_title': 'Interstellar', 'year': '2014',
                 'search_terms': ['Интерстеллар'], 'is_series': False}
        release = {'id': 'x', 'title': 'Example', 'seeds': 5, 'display_year': '2024'}
        with patch('backend.metadata.resolve_movie_online', new=AsyncMock(return_value=movie)), \
             patch('backend.metadata.enrich_search_results', new=AsyncMock(return_value=[release])), \
             patch('backend.metadata.curate_verified_editions', return_value=[]), \
             patch.object(main, 'search_rutor', new=AsyncMock(return_value=[release])), \
             patch.object(main.rutracker_client, 'search', new=AsyncMock(return_value=[])):
            result = await main.search('Интерстеллар', 'all', 30)
        self.assertEqual(result['movie']['year'], '2014')


if __name__ == '__main__':
    unittest.main()
