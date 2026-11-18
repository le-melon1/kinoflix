(function () {
    'use strict';

    // Fix internal Lampa bug: "TypeError: Cannot redefine property: enabled" in setupAudioTracks
    (function fixLampaAudioTracksBug() {
        try {
            var origDefineProperty = Object.defineProperty;
            Object.defineProperty = function (obj, prop, descriptor) {
                try {
                    if (descriptor && typeof descriptor === 'object' && descriptor.configurable === undefined) {
                        descriptor.configurable = true;
                    }
                    return origDefineProperty.call(Object, obj, prop, descriptor);
                } catch (err) {
                    if (err && err.message && err.message.indexOf('Cannot redefine property') !== -1) {
                        return obj;
                    }
                    throw err;
                }
            };

            window.addEventListener('error', function (e) {
                var msg = (e && (e.message || (e.error && e.error.message))) || '';
                if (msg.indexOf('Cannot redefine property') !== -1 || msg.indexOf('setupAudioTracks') !== -1) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    return true;
                }
            }, true);
        } catch (e) {}
    })();

    var defaultServer = 'http://127.0.0.1:7890';

    function getServerUrl() {
        var s = Lampa.Storage.get('kinoflix_server_ip', defaultServer);
        if (!s || s.indexOf('lampa.mx') !== -1) {
            s = defaultServer;
            Lampa.Storage.set('kinoflix_server_ip', s);
        }
        return s;
    }

    function initSettings() {
        if (window.kinoflix_settings_inited) return;
        window.kinoflix_settings_inited = true;

        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({
                component: 'kinoflix',
                name: 'KinoFlix Server',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>'
            });
            Lampa.SettingsApi.addParam({
                component: 'kinoflix',
                param: {
                    name: 'kinoflix_server_ip',
                    type: 'input',
                    default: defaultServer,
                    values: ''
                },
                field: {
                    name: 'Адрес сервера KinoFlix',
                    description: 'IP и порт бэкенда KinoFlix (например, http://127.0.0.1:7890)'
                }
            });
        }
        initAuto1080p();
    }

    function initAuto1080p() {
        try {
            Lampa.Storage.set('video_quality_default', 1080);
            Lampa.Storage.set('modss_default_quality', '1080');
            Lampa.Storage.set('online_mod_default_quality', '1080');
        } catch (e) {}

        function doHookHls() {
            if (window._kinoflix_hls_hooked) return;
            if (!window.Hls || !window.Hls.prototype) return;
            window._kinoflix_hls_hooked = true;
            console.log('[KinoFlix Auto1080] Hooking Hls.prototype.attachMedia & loadSource');

            var origAttach = Hls.prototype.attachMedia;
            Hls.prototype.attachMedia = function (media) {
                var self = this;
                self.on(Hls.Events.MANIFEST_PARSED, function () {
                    try {
                        if (self.levels && self.levels.length > 0) {
                            var targetIdx = 0;
                            var maxH = 0;
                            for (var i = 0; i < self.levels.length; i++) {
                                var h = self.levels[i].height || 0;
                                if (h >= maxH) {
                                    maxH = h;
                                    targetIdx = i;
                                }
                            }
                            self.currentLevel = targetIdx;
                            self.loadLevel = targetIdx;
                            console.log('[KinoFlix Auto1080] Auto-selected max HLS level:', targetIdx, self.levels[targetIdx]);
                        }
                    } catch (e) {
                        console.error('[KinoFlix Auto1080] Level error:', e);
                    }
                });

                if (media) {
                    var ensurePlay = function () {
                        if (media.paused && Lampa.Player && Lampa.Player.opened && Lampa.Player.opened()) {
                            media.play().catch(function () {});
                        }
                    };
                    media.addEventListener('canplay', ensurePlay);
                    media.addEventListener('seeked', ensurePlay);
                }

                return origAttach.apply(this, arguments);
            };

            var origLoadSource = Hls.prototype.loadSource;
            Hls.prototype.loadSource = function (url) {
                try {
                    if (this.config) {
                        this.config.startLevel = -1;
                    }
                } catch (e) {}
                return origLoadSource.apply(this, arguments);
            };
        }

        doHookHls();

        var hookInterval = setInterval(function () {
            doHookHls();
            if (window._kinoflix_hls_hooked) clearInterval(hookInterval);
        }, 300);
        setTimeout(function () { clearInterval(hookInterval); }, 15000);

        if (Lampa.PlayerPanel && !Lampa.PlayerPanel._kinoflix_hooked) {
            Lampa.PlayerPanel._kinoflix_hooked = true;
            var origSetLevels = Lampa.PlayerPanel.setLevels;
            Lampa.PlayerPanel.setLevels = function (levels, current) {
                var bestKey = current;
                if (levels && typeof levels === 'object') {
                    var keys = Object.keys(levels);
                    keys.sort(function (a, b) { return parseInt(b) - parseInt(a); });
                    if (keys.length > 0) bestKey = keys[0];
                }
                return origSetLevels.call(this, levels, bestKey);
            };
        }

        setInterval(function () {
            try {
                var v = document.querySelector('video');
                var qBtn = document.querySelector('.player-panel__quality');
                if (v && qBtn && v.videoWidth > 0) {
                    var curRes = v.videoWidth + 'x' + v.videoHeight;
                    if (qBtn.textContent.trim() !== curRes && v.videoHeight >= 720) {
                        qBtn.textContent = curRes;
                    }
                }
            } catch (e) {}
        }, 1000);
    }

    function injectStyles() {
        if ($('#kinoflix-aio-styles').length) return;
        var style = `
            <style id="kinoflix-aio-styles">
                .full-start-new__buttons .button--kinoflix-quick1080,
                .full-start__buttons .button--kinoflix-quick1080 {
                    display: inline-flex !important;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 22px !important;
                    border-radius: 24px !important;
                    cursor: pointer;
                    font-weight: 700 !important;
                    font-size: 14px !important;
                    background: linear-gradient(135deg, #e50914 0%, #b81d24 100%) !important;
                    border: 1px solid #ff4d4d !important;
                    color: #fff !important;
                    margin-right: 12px !important;
                    box-shadow: 0 0 16px rgba(229, 9, 20, 0.6) !important; order: -9999 !important;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .full-start-new__buttons .button--kinoflix-quick1080:hover,
                .full-start-new__buttons .button--kinoflix-quick1080.focus,
                .full-start__buttons .button--kinoflix-quick1080:hover,
                .full-start__buttons .button--kinoflix-quick1080.focus {
                    transform: scale(1.08) !important;
                    box-shadow: 0 0 24px rgba(229, 9, 20, 0.9) !important;
                }
                .full-start-new__buttons .button--kinoflix-aio,
                .full-start__buttons .button--kinoflix-aio {
                    display: inline-flex !important;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px !important;
                    border-radius: 20px !important;
                    cursor: pointer;
                    font-weight: 500;
                    margin-right: 8px;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .full-start-new__buttons .button--kinoflix-aio:hover,
                .full-start-new__buttons .button--kinoflix-aio.focus,
                .full-start__buttons .button--kinoflix-aio:hover,
                .full-start__buttons .button--kinoflix-aio.focus {
                    transform: scale(1.05);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                }
                .full-start-new__buttons .button--kinoflix-aio span {
                    display: inline-block !important;
                    font-size: 13px !important;
                    line-height: 1.2;
                }
                .full-start-new__buttons .button--kinoflix-aio svg {
                    flex-shrink: 0;
                }
            </style>
        `;
        $('head').append(style);
    }

    function allInOnePlugin() {
        initSettings();
        injectStyles();

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' && e.type !== 'complete') return;
            injectStyles();
            try { Lampa.Storage.set('full_btn_priority', ''); } catch (err) {}

            var movie = e.data && e.data.movie ? e.data.movie : (e.object && e.object.card ? e.object.card : null);
            if (!movie) return;

            var rawElem = e.body || (e.object && e.object.activity && e.object.activity.slide) || (Lampa.Activity.active() && Lampa.Activity.active().activity && Lampa.Activity.active().activity.slide) || $('.activity--active, .full-start-new, .full-start').last();
            var render = $(rawElem);
            if (!render || !render.length) return;

            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length) container = $('.full-start-new__buttons, .full-start__buttons').last();
            if (!container || !container.length) return;

            if (container.find('.button--kinoflix-quick1080').length) return;

            var title = movie.title || movie.name || '';
            var year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
            var isTv = !!(movie.first_air_date || movie.number_of_seasons || movie.seasons || (movie.type === 'tv') || (movie.name && !movie.title));

            function formatDuration(sec) {
                if (!sec || sec <= 0) return '';
                var m = Math.floor(sec / 60);
                var h = Math.floor(m / 60);
                m = m % 60;
                if (h > 0) return h + 'ч ' + m + 'м';
                return m + ' мин';
            }

            function parseVideoTitle(rawTitle, durStr, targetSeason, targetEpisode, isSeries) {
                var titleText = rawTitle || '';
                var lower = titleText.toLowerCase();

                // 1. Trailer / clip / preview check
                var isTrailer = false;
                var trailerWords = [
                    'трейлер', 'тизер', 'обзор', 'разбор', 'реакция', 'клип', 'фрагмент', 'отрывок', 'саундтрек',
                    'прохождение', 'геймплей', 'gameplay', 'letsplay', 'игрофильм', 'фильм о фильме', 'trailer', 'teaser',
                    'часть 1', 'часть 2', 'часть i', 'часть ii', 'пародия', 'бэкстейдж', 'шортс', 'shorts',
                    'playstation', 'ps5', 'ps4', 'xbox'
                ];
                for (var i = 0; i < trailerWords.length; i++) {
                    if (lower.indexOf(trailerWords[i]) !== -1) {
                        isTrailer = true;
                        break;
                    }
                }

                var durationSec = 0;
                if (durStr) {
                    if (durStr.indexOf(':') !== -1) {
                        var parts = durStr.split(':').map(Number);
                        if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
                    } else {
                        var mH = durStr.match(/(\d+)\s*(?:ч|час)/i);
                        var mM = durStr.match(/(\d+)\s*(?:м|мин)/i);
                        var mS = durStr.match(/(\d+)\s*(?:с|сек)/i);
                        if (mH) durationSec += parseInt(mH[1], 10) * 3600;
                        if (mM) durationSec += parseInt(mM[1], 10) * 60;
                        if (mS) durationSec += parseInt(mS[1], 10);
                    }
                }
                if (durationSec > 0 && durationSec <= 600 && isSeries && targetEpisode !== null && targetEpisode !== undefined) {
                    isTrailer = true;
                }

                if (isTrailer) {
                    return {
                        badge: '🔴 [ОБЗОР / НЕ СЕРИЯ]',
                        rank: 10,
                        note: 'Не является полной серией'
                    };
                }

                // 2. Full season compilation
                var isFullSeason = /(?:все\s*серии|весь\s*сезон|сезон\s*целиком|\d+-\d+\s*сери[яи])/i.test(titleText) || durationSec > 10800;
                if (isFullSeason) {
                    return {
                        badge: '🔵 [ВЕСЬ СЕЗОН]',
                        rank: 80,
                        note: 'Сборник всех серий'
                    };
                }

                // 3. Series episode matching
                if (isSeries && targetEpisode !== null && targetEpisode !== undefined) {
                    var foundSeason = null;
                    var foundEpisode = null;

                    // 1. Check 1x02 or 1х02
                    var mX = titleText.match(/\b0*(\d{1,2})[xх]0*(\d{1,3})\b/i);
                    if (mX) {
                        foundSeason = parseInt(mX[1], 10);
                        foundEpisode = parseInt(mX[2], 10);
                    } else {
                        // 2. Season: S01, 1 сезон, 1-й сезон, сезон 1
                        var mS = titleText.match(/(?:s0*(\d{1,2})|\b(\d{1,2})(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))/i);
                        if (mS) {
                            foundSeason = parseInt(mS[1] || mS[2] || mS[3], 10);
                        }
                        // 3. Episode: E01, 1 серия, 1-я серия, серия 1, эпизод 1
                        var mE = titleText.match(/(?:e0*(\d{1,3})|\b(\d{1,3})(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*(\d{1,3}))/i);
                        if (mE) {
                            foundEpisode = parseInt(mE[1] || mE[2] || mE[3], 10);
                        }
                    }

                    if (foundEpisode !== null) {
                        var seasonMatch = (targetSeason === null || foundSeason === null || foundSeason === targetSeason);
                        if (foundEpisode === targetEpisode && seasonMatch) {
                            return {
                                badge: '🟢 [СЕРИЯ НАЙДЕНА: S' + (foundSeason || targetSeason) + ' E' + foundEpisode + ']',
                                rank: 100,
                                note: '✅ Точное совпадение серии'
                            };
                        } else {
                            return {
                                badge: '⚪️ [ДРУГАЯ СЕРИЯ: S' + (foundSeason || '?') + ' E' + foundEpisode + ']',
                                rank: 30,
                                note: '⚠️ Не совпадает (запрошена ' + targetEpisode + ' серия)'
                            };
                        }
                    }

                    return {
                        badge: '⚪️ [БЕЗ НОМЕРА СЕРИИ]',
                        rank: 50,
                        note: ''
                    };
                }

                // 4. Movie mode
                if (!isSeries) {
                    if (durationSec >= 3000) {
                        return {
                            badge: '🎬 [ПОЛНЫЙ ФИЛЬМ]',
                            rank: 100,
                            note: 'Полная версия'
                        };
                    } else if (durationSec > 0 && durationSec < 1800) {
                        return {
                            badge: '🔴 [ТРЕЙЛЕР / ОТРЫВОК]',
                            rank: 20,
                            note: 'Короткий ролик'
                        };
                    }
                }

                return {
                    badge: '',
                    rank: 60,
                    note: ''
                };
            }

            function pickEpisode(onTargetReady) {
                var movieDuration = (movie.runtime ? movie.runtime * 60 : 0) || (movie.duration ? movie.duration * 60 : 0) || 5400;
                var epDuration = (movie.episode_run_time && movie.episode_run_time[0] ? movie.episode_run_time[0] * 60 : 0) || 2700;
                if (!isTv) {
                    var q = title;
                    if (year) q += ' ' + year;
                    return onTargetReady({
                        isTv: false,
                        query: q,
                        targetSeason: null,
                        targetEpisode: null,
                        dialogTitle: title,
                        duration: movieDuration
                    });
                }

                var seasons = movie.seasons || [];
                var sItems = [];

                if (seasons.length) {
                    seasons.forEach(function (s) {
                        if (s.season_number > 0) {
                            sItems.push({
                                title: s.name || ('Сезон ' + s.season_number),
                                subtitle: s.episode_count ? s.episode_count + ' серий' : '',
                                season: s.season_number,
                                episodes: s.episode_count || 12
                            });
                        }
                    });
                } else {
                    var totalS = movie.number_of_seasons || 1;
                    for (var i = 1; i <= totalS; i++) {
                        sItems.push({
                            title: 'Сезон ' + i,
                            subtitle: '',
                            season: i,
                            episodes: 12
                        });
                    }
                }

                sItems.push({
                    title: '🔍 Поиск по всему сериалу',
                    subtitle: 'Без указания конкретной серии',
                    season: null,
                    episodes: 0
                });

                Lampa.Select.show({
                    title: title + ': Выберите сезон',
                    items: sItems,
                    onSelect: function (selS) {
                        if (Lampa.Select.closeAll) Lampa.Select.closeAll();
                        else if (Lampa.Select.close) Lampa.Select.close();

                        setTimeout(function () {
                            if (selS.season === null) {
                                return onTargetReady({
                                    isTv: true,
                                    query: title,
                                    targetSeason: null,
                                    targetEpisode: null,
                                    dialogTitle: title,
                                    duration: epDuration
                                });
                            }

                            var epItems = [];
                            var count = selS.episodes || 12;
                            for (var ep = 1; ep <= count; ep++) {
                                epItems.push({
                                    title: 'Серия ' + ep,
                                    subtitle: 'Сезон ' + selS.season + ' • ' + title,
                                    season: selS.season,
                                    episode: ep
                                });
                            }
                            epItems.push({
                                title: '🔍 Все серии ' + selS.season + ' сезона',
                                subtitle: 'Искать сезон целиком',
                                season: selS.season,
                                episode: null
                            });

                            Lampa.Select.show({
                                title: title + ': Сезон ' + selS.season + ' (Выберите серию)',
                                items: epItems,
                                onSelect: function (selEp) {
                                    if (Lampa.Select.closeAll) Lampa.Select.closeAll();
                                    else if (Lampa.Select.close) Lampa.Select.close();

                                    setTimeout(function () {
                                        var targetQuery = title;
                                        if (selEp.episode !== null) {
                                            targetQuery += ' ' + selEp.season + ' сезон ' + selEp.episode + ' серия';
                                        } else {
                                            targetQuery += ' ' + selEp.season + ' сезон';
                                        }
                                        onTargetReady({
                                            isTv: true,
                                            query: targetQuery,
                                            targetSeason: selEp.season,
                                            targetEpisode: selEp.episode,
                                            dialogTitle: title + (selEp.episode ? ' (S' + selEp.season + ' E' + selEp.episode + ')' : ' (Сезон ' + selEp.season + ')'),
                                            duration: epDuration
                                        });
                                    }, 50);
                                }
                            });
                        }, 50);
                    }
                });
            }

            // 1. VK Video Button
            var btnVk = $(`
                <div class="full-start__button selector button--kinoflix-aio button--kinoflix-vk" style="background: rgba(0, 119, 255, 0.28); border: 1px solid rgba(0, 119, 255, 0.85);" data-subtitle="VK Видео (Без рекламы)">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.38 12.83h-1.6c-.6 0-.78-.48-1.85-1.55-.93-.9-1.34-1.02-1.57-1.02-.32 0-.41.09-.41.53v1.44c0 .38-.12.6-.1.6h-1.4c-2.3 0-4.83-2.1-6.62-5.41-.09-.17-.18-.36-.26-.56-.12-.3-.02-.45.3-.45h1.6c.41 0 .56.19.72.63.78 2.27 2.1 4.26 2.65 4.26.2 0 .3-.09.3-.6V10.1c-.06-1.1-.64-1.2-.64-1.59 0-.19.16-.38.42-.38h2.52c.35 0 .47.19.47.61v3.31c0 .35.15.47.26.47.2 0 .38-.12.77-.51 1.2-1.34 2.05-3.41 2.05-3.41.11-.23.32-.47.74-.47h1.6c.48 0 .58.25.48.6-.2 0-.91 1.62-2.1 2.97-.52.59-.72.86 0 1.57.51.52 1.48 1.45 1.77 2.08.22.46-.07.89-.5.89z"/>
                    </svg>
                    <span>VK Видео (Без рекламы)</span>
                </div>
            `);
            btnVk.on('hover:enter', function () {
                pickEpisode(function (target) {
                    Lampa.Noty.show('Поиск в VK Видео: ' + target.query);
                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                    var server = getServerUrl();
                    var vkSearchUrl = server + '/api/online/vk?query=' + encodeURIComponent(target.query);
                    if (target.targetSeason) vkSearchUrl += '&season=' + encodeURIComponent(target.targetSeason);
                    if (target.targetEpisode) vkSearchUrl += '&episode=' + encodeURIComponent(target.targetEpisode);

                    $.ajax({
                        url: vkSearchUrl,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 10000,
                        success: function (results) {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            if (!results || !results.length) return Lampa.Noty.show('В VK Видео ничего не найдено');

                            var items = results.map(function (it) {
                                var durStr = it.duration_str || (it.duration ? formatDuration(it.duration) : '');
                                var analysis = parseVideoTitle(it.title, durStr, target.targetSeason, target.targetEpisode, target.isTv);
                                var badge = it.badge || analysis.badge || '';
                                var displayTitle = (badge ? badge + ' ' : '') + it.title;
                                var subParts = [];
                                if (durStr) subParts.push('⏱ ' + durStr);
                                if (it.author) subParts.push(it.author);
                                if (it.note || analysis.note) subParts.push(it.note || analysis.note);

                                return {
                                    title: displayTitle,
                                    subtitle: subParts.join(' • '),
                                    raw: it,
                                    rank: (it.rank !== undefined ? it.rank : analysis.rank)
                                };
                            });

                            items.sort(function (a, b) { return b.rank - a.rank; });

                            Lampa.Select.show({
                                title: 'VK Видео: ' + target.dialogTitle,
                                items: items,
                                onSelect: function (sel) {
                                    if (sel.rank <= 30) {
                                        Lampa.Noty.show('Внимание: это не запрошенная серия!');
                                    }
                                    Lampa.Noty.show('Извлечение стрима VK...');
                                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                                    $.ajax({
                                        url: server + '/api/online/vk/stream?id=' + encodeURIComponent(sel.raw.id),
                                        type: 'GET',
                                        dataType: 'json',
                                        timeout: 15000,
                                        success: function (s) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            if (s && s.stream_url) {
                                                var playUrl = s.stream_url;
                                                if (playUrl.startsWith('/')) playUrl = server + playUrl;
                                                Lampa.Player.play({ url: playUrl, title: sel.raw.title });
                                            } else {
                                                Lampa.Noty.show('Не удалось извлечь видео VK');
                                            }
                                        },
                                        error: function (xhr) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            var msg = 'Ошибка соединения с VK Видео';
                                            try {
                                                var errObj = JSON.parse(xhr.responseText);
                                                if (errObj && errObj.detail) msg = errObj.detail;
                                            } catch (e) {}
                                            Lampa.Noty.show(msg);
                                        }
                                    });
                                }
                            });
                        },
                        error: function () {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            Lampa.Noty.show('Ошибка поиска VK');
                        }
                    });
                });
            });

            // 2. Rutube Button
            var btnRt = $(`
                <div class="full-start__button selector button--kinoflix-aio button--kinoflix-rt" style="background: rgba(0, 168, 255, 0.25); border: 1px solid rgba(0, 168, 255, 0.8);" data-subtitle="Rutube (Без рекламы)">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    <span>Rutube (Без рекламы)</span>
                </div>
            `);
            btnRt.on('hover:enter', function () {
                pickEpisode(function (target) {
                    Lampa.Noty.show('Поиск на Rutube: ' + target.query);
                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                    var server = getServerUrl();
                    var rtSearchUrl = server + '/api/online/rutube?query=' + encodeURIComponent(target.query);
                    if (target.targetSeason) rtSearchUrl += '&season=' + encodeURIComponent(target.targetSeason);
                    if (target.targetEpisode) rtSearchUrl += '&episode=' + encodeURIComponent(target.targetEpisode);

                    $.ajax({
                        url: rtSearchUrl,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 10000,
                        success: function (results) {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            if (!results || !results.length) return Lampa.Noty.show('На Rutube ничего не найдено');

                            var items = results.map(function (it) {
                                var durStr = it.duration_str || (it.duration ? formatDuration(it.duration) : '');
                                var analysis = parseVideoTitle(it.title, durStr, target.targetSeason, target.targetEpisode, target.isTv);
                                var badge = it.badge || analysis.badge || '';
                                var displayTitle = (badge ? badge + ' ' : '') + it.title;
                                var subParts = [];
                                if (durStr) subParts.push('⏱ ' + durStr);
                                if (it.author) subParts.push(it.author);
                                if (it.note || analysis.note) subParts.push(it.note || analysis.note);

                                return {
                                    title: displayTitle,
                                    subtitle: subParts.join(' • '),
                                    raw: it,
                                    rank: (it.rank !== undefined ? it.rank : analysis.rank)
                                };
                            });

                            items.sort(function (a, b) { return b.rank - a.rank; });

                            if (target.targetEpisode && (!items.length || items[0].rank < 85)) {
                                Lampa.Noty.show('Rutube: точной серии не найдено. На Rutube многие сериалы блокируются правообладателями, используйте VK Видео или KinoFlix P2P', 5000);
                            }

                            Lampa.Select.show({
                                title: 'Rutube: ' + target.dialogTitle,
                                items: items,
                                onSelect: function (sel) {
                                    if (sel.rank <= 30) {
                                        Lampa.Noty.show('Внимание: это не запрошенная серия!');
                                    }
                                    Lampa.Noty.show('Извлечение чистого стрима Rutube...');
                                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                                    $.ajax({
                                        url: server + '/api/online/rutube/stream?id=' + encodeURIComponent(sel.raw.id),
                                        type: 'GET',
                                        dataType: 'json',
                                        timeout: 15000,
                                        success: function (s) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            if (s && s.stream_url) {
                                                var playUrl = s.stream_url;
                                                if (playUrl.startsWith('/')) playUrl = server + playUrl;
                                                Lampa.Player.play({ url: playUrl, title: sel.raw.title });
                                            } else {
                                                Lampa.Noty.show('Не удалось извлечь стрим Rutube');
                                            }
                                        },
                                        error: function (xhr) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            var msg = 'Видео недоступно на Rutube (заблокировано правообладателем или удалено)';
                                            try {
                                                var errObj = JSON.parse(xhr.responseText);
                                                if (errObj && errObj.detail) msg = errObj.detail;
                                            } catch (e) {}
                                            Lampa.Noty.show(msg, 4000);
                                        }
                                    });
                                }
                            });
                        },
                        error: function () {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            Lampa.Noty.show('Ошибка поиска на Rutube');
                        }
                    });
                });
            });

            // 3. KinoFlix P2P Button
            var btnKf = $(`
                <div class="full-start__button selector button--kinoflix-aio button--kinoflix-kf" style="background: rgba(229, 9, 20, 0.28); border: 1px solid rgba(229, 9, 20, 0.85);" data-subtitle="KinoFlix P2P TorrServer">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                    </svg>
                    <span>KinoFlix P2P</span>
                </div>
            `);
            btnKf.on('hover:enter', function () {
                pickEpisode(function (target) {
                    Lampa.Noty.show('Поиск торрент-раздач: ' + target.query);
                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                    var server = getServerUrl();
                    var searchUrl = server + '/api/search?q=' + encodeURIComponent(target.query);
                    if (target.targetSeason) searchUrl += '&season=' + target.targetSeason;
                    if (target.targetEpisode) searchUrl += '&episode=' + target.targetEpisode;

                    $.ajax({
                        url: searchUrl,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 15000,
                        success: function (data) {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            var torrents = data.results || (Array.isArray(data) ? data : []);
                            if (!torrents.length) return Lampa.Noty.show('Раздач в KinoFlix не найдено');

                            var items = torrents.map(function (it) {
                                var seeds = it.seeders || it.seeds || 0;
                                var badge = it.badge || '';
                                var displayTitle = (badge ? badge + ' ' : '') + it.title;
                                var subParts = [];
                                if (it.quality) subParts.push(it.quality);
                                if (it.size) subParts.push(it.size);
                                subParts.push('🌱 ' + seeds + ' сидов');
                                if (it.badge_note) subParts.push(it.badge_note);

                                return {
                                    title: displayTitle,
                                    subtitle: subParts.join(' • '),
                                    raw: it,
                                    rank: it.rank || 50
                                };
                            });

                            items.sort(function (a, b) {
                                if (b.rank !== a.rank) return b.rank - a.rank;
                                return (b.raw.seeds || 0) - (a.raw.seeds || 0);
                            });

                            function startKinoFlixPlayback(params) {
                                var totalDuration = Math.round(params.duration || 5400);
                                var baseStreamUrl = params.url;
                                var currentOffset = 0;
                                var isSeeking = false;
                                var seekTimer = null;
                                var managerActive = true;

                                Lampa.Player.play({
                                    url: baseStreamUrl,
                                    title: params.title,
                                    torrent_hash: params.hash,
                                    timeline: {
                                        hash: params.hash || Lampa.Utils.hash(params.title),
                                        total: totalDuration,
                                        duration: totalDuration,
                                        time: 0
                                    }
                                });

                                var hookVideo = function () {
                                    var video = Lampa.PlayerVideo.video();
                                    if (!video) return;

                                    var origDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');

                                    // 1. Force video.duration to always report full movie duration
                                    try {
                                        Object.defineProperty(video, 'duration', {
                                            get: function () {
                                                return totalDuration;
                                            },
                                            configurable: true
                                        });
                                    } catch (e) {}

                                    // 2. Virtual currentTime for seamless bidirectional seeking across the whole movie
                                    try {
                                        Object.defineProperty(video, 'currentTime', {
                                            get: function () {
                                                if (isSeeking) return currentOffset;
                                                var raw = 0;
                                                try {
                                                    raw = origDesc ? origDesc.get.call(video) : 0;
                                                } catch (e) {}
                                                return currentOffset + (raw || 0);
                                            },
                                            set: function (targetSeconds) {
                                                if (!managerActive) return;
                                                targetSeconds = Math.max(0, Math.min(targetSeconds, totalDuration));

                                                var currentVirtual = currentOffset + (origDesc ? (origDesc.get.call(video) || 0) : 0);
                                                if (Math.abs(targetSeconds - currentVirtual) < 1.0) return;

                                                clearTimeout(seekTimer);
                                                seekTimer = setTimeout(function () {
                                                    currentOffset = targetSeconds;
                                                    isSeeking = true;

                                                    var cleanUrl = baseStreamUrl.replace(/([&?])ss=\d+(\.\d+)?(&|$)/, '$1').replace(/[&?]$/, '');
                                                    var seekUrl = cleanUrl + (cleanUrl.indexOf('?') >= 0 ? '&' : '?') + 'ss=' + Math.floor(targetSeconds);

                                                    if (Lampa.Loading) Lampa.Loading.start(function () {});

                                                    video.src = seekUrl;
                                                    video.load();

                                                    var onCanPlay = function () {
                                                        video.removeEventListener('canplay', onCanPlay);
                                                        isSeeking = false;
                                                        if (Lampa.Loading) Lampa.Loading.stop();
                                                        video.play().catch(function () {});
                                                    };
                                                    video.addEventListener('canplay', onCanPlay);

                                                    setTimeout(function () {
                                                        if (isSeeking) {
                                                            isSeeking = false;
                                                            if (Lampa.Loading) Lampa.Loading.stop();
                                                            video.play().catch(function () {});
                                                        }
                                                    }, 4000);
                                                }, 120);
                                            },
                                            configurable: true
                                        });
                                    } catch (e) {}
                                };

                                var onPlayerReady = function () {
                                    setTimeout(hookVideo, 100);
                                };

                                var onPlayerDestroy = function () {
                                    managerActive = false;
                                    clearTimeout(seekTimer);
                                    Lampa.Player.listener.remove('ready', onPlayerReady);
                                    Lampa.Player.listener.remove('destroy', onPlayerDestroy);
                                };

                                Lampa.Player.listener.follow('ready', onPlayerReady);
                                Lampa.Player.listener.follow('destroy', onPlayerDestroy);
                            }

                            Lampa.Select.show({
                                title: 'KinoFlix P2P: ' + target.dialogTitle,
                                items: items,
                                onSelect: function (sel) {
                                    Lampa.Noty.show('Запуск P2P стриминга TorrServer...');
                                    if (Lampa.Loading) Lampa.Loading.start(function () {});
                                    $.ajax({
                                        url: server + '/api/stream/prepare',
                                        type: 'POST',
                                        contentType: 'application/json',
                                        data: JSON.stringify({
                                            link: sel.raw.link || sel.raw.magnet || '',
                                            magnet: sel.raw.magnet || '',
                                            title: sel.raw.title,
                                            topic_id: sel.raw.topic_id ? String(sel.raw.topic_id) : undefined,
                                            season: target.targetSeason,
                                            episode: target.targetEpisode,
                                            duration: target.duration || undefined
                                        }),
                                        timeout: 20000,
                                        success: function (prepData) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            var playUrl = prepData.stream_url || prepData.url;
                                            if (playUrl && playUrl.startsWith('/')) playUrl = server + playUrl;
                                            if (playUrl) {
                                                var totalDur = prepData.duration || target.duration || 5400;
                                                var playTitle = (target.isTv && target.targetEpisode ? (title + ' (S' + target.targetSeason + ' E' + target.targetEpisode + ')') : sel.raw.title);
                                                startKinoFlixPlayback({
                                                    url: playUrl,
                                                    direct_url: prepData.direct_url,
                                                    title: playTitle,
                                                    hash: prepData.hash,
                                                    duration: totalDur
                                                });
                                            } else {
                                                Lampa.Noty.show('Ошибка запуска потока');
                                            }
                                        },
                                        error: function () {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            Lampa.Noty.show('Ошибка запуска P2P стрима');
                                        }
                                    });
                                }
                            });
                        },
                        error: function () {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            Lampa.Noty.show('Ошибка связи с сервером KinoFlix');
                        }
                    });
                });
            });

            var btnQuick1080 = $(`
                <div class="full-start__button selector button--kinoflix-aio button--kinoflix-quick1080" data-subtitle="Смотреть онлайн (1080p)">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <polygon points="6,4 20,12 6,20"></polygon>
                    </svg>
                    <span>Смотреть</span>
                </div>
            `);
            btnQuick1080.on('hover:enter click', function () {
                launch1080Instantly();
            });
            if (btnQuick1080[0]) {
                btnQuick1080[0].addEventListener('hover:enter', function () {
                    launch1080Instantly();
                });
                btnQuick1080[0].addEventListener('click', function () {
                    launch1080Instantly();
                });
            }

            function launch1080Instantly() {
                if (Lampa.Noty) Lampa.Noty.show('Запуск «' + title + '» в 1080p...');
                if (Lampa.Loading) Lampa.Loading.start(function () {});

                var server = getServerUrl();
                var kpId = movie.kinopoisk_id || movie.kp_id || (movie.external_ids && (movie.external_ids.kp_id || movie.external_ids.kinopoisk_id));
                var imdbId = movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id);
                var q = title + (year ? ' ' + year : '');

                function startDirect(url, streamTitle) {
                    if (Lampa.Loading) Lampa.Loading.stop();
                    Lampa.Storage.set('video_quality_default', '1080');
                    Lampa.Storage.set('player', 'inner');
                    Lampa.Storage.set('player_torrent', 'inner');
                    if (Lampa.Player && typeof Lampa.Player.runas === 'function') Lampa.Player.runas('inner');
                    if (Lampa.Player && typeof Lampa.Player.opened === 'function' && Lampa.Player.opened()) {
                        try { Lampa.Player.destroy(); } catch(e) {}
                    }
                    if (Lampa.Preroll) Lampa.Preroll.show = function(d, cb) { if (cb) cb(); };
                    $('.player-video__noise').remove();
                    $('.player-video').removeClass('player-video--error video--load');

                    Lampa.Player.play({
                        url: url,
                        title: streamTitle || title,
                        quality: { '1080p': url }
                    });

                    setTimeout(function () {
                        $('.player-video__noise').remove();
                        $('.player-video').removeClass('player-video--error video--load');
                        var v = document.querySelector('video');
                        if (v && v.paused) {
                            v.play().catch(function () {});
                        }
                    }, 350);
                }

                function tryCollaps(onFail) {
                    function fetchStream(endpoint, nextFallback) {
                        $.ajax({
                            url: 'https://api.kinogram.best/embed/' + endpoint,
                            type: 'GET',
                            dataType: 'text',
                            timeout: 5000,
                            success: function (html) {
                                var match = html.match(/https:\/\/[^"'\s]*master\.m3u8[^"'\s]*/);
                                if (match && match[0]) {
                                    console.log('[Quick1080] Found Collaps 1080p stream:', match[0]);
                                    return startDirect(match[0], title + ' [1080p Full HD]');
                                }
                                nextFallback();
                            },
                            error: nextFallback
                        });
                    }

                    if (kpId && imdbId) {
                        fetchStream('kp/' + kpId, function () {
                            fetchStream('imdb/' + imdbId, onFail);
                        });
                    } else if (kpId) {
                        fetchStream('kp/' + kpId, onFail);
                    } else if (imdbId) {
                        fetchStream('imdb/' + imdbId, onFail);
                    } else {
                        onFail();
                    }
                }

                function tryVk(onFail) {
                    $.ajax({
                        url: server + '/api/online/vk?query=' + encodeURIComponent(q),
                        type: 'GET',
                        dataType: 'json',
                        timeout: 6000,
                        success: function (items) {
                            var top = items && items[0];
                            if (top && top.id) {
                                $.ajax({
                                    url: server + '/api/online/vk/stream?id=' + encodeURIComponent(top.id),
                                    type: 'GET',
                                    dataType: 'json',
                                    timeout: 8000,
                                    success: function (sData) {
                                        var sUrl = sData.stream_url;
                                        if (sUrl && sUrl.startsWith('/')) sUrl = server + sUrl;
                                        if (sUrl) {
                                            console.log('[Quick1080] Found VK 1080p stream:', sUrl);
                                            return startDirect(sUrl, top.title || title);
                                        }
                                        onFail();
                                    },
                                    error: onFail
                                });
                            } else {
                                onFail();
                            }
                        },
                        error: onFail
                    });
                }

                function tryP2P(onFail) {
                    $.ajax({
                        url: server + '/api/search?q=' + encodeURIComponent(q) + '&source=all',
                        type: 'GET',
                        dataType: 'json',
                        timeout: 8000,
                        success: function (data) {
                            var ver = data.verified_editions || [];
                            var res = data.results || [];
                            var top = ver[0] || res[0];
                            if (top && (top.magnet || top.link || top.topic_id)) {
                                $.ajax({
                                    url: server + '/api/stream/prepare',
                                    type: 'POST',
                                    contentType: 'application/json',
                                    data: JSON.stringify({
                                        magnet: top.magnet || top.link,
                                        title: top.title,
                                        topic_id: top.topic_id ? String(top.topic_id) : undefined
                                    }),
                                    timeout: 15000,
                                    success: function (prep) {
                                        var pUrl = prep.stream_url || prep.url;
                                        if (pUrl && pUrl.startsWith('/')) pUrl = server + pUrl;
                                        if (pUrl) {
                                            console.log('[Quick1080] Found P2P 1080p stream:', pUrl);
                                            return startDirect(pUrl, top.title);
                                        }
                                        onFail();
                                    },
                                    error: onFail
                                });
                            } else {
                                onFail();
                            }
                        },
                        error: onFail
                    });
                }

                function fallbackModss() {
                    if (Lampa.Loading) Lampa.Loading.stop();
                    var modssBtn = $('.view--modss_online, .view--online_mod').first();
                    if (modssBtn.length) {
                        Lampa.Noty.show('⚡ Переход в балансер...');
                        modssBtn.trigger('hover:enter');
                    } else {
                        Lampa.Noty.show('Не удалось найти поток 1080p');
                    }
                }

                tryCollaps(function () {
                    tryVk(function () {
                        tryP2P(function () {
                            fallbackModss();
                        });
                    });
                });
            }

            function ensureQuickButton() {
                try {
                    if (container && container[0] && document.body.contains(container[0])) {
                        container.find('.view--modss_online, .view--online_mod').hide();
                        container.find('.button--play').removeClass('hide').show();
                        if (!container.find('.button--kinoflix-quick1080').length) {
                            container.prepend(btnQuick1080);
                        } else if (container.children().first()[0] !== btnQuick1080[0]) {
                            container.prepend(btnQuick1080);
                        }
                    }
                } catch (e) {}
            }

            ensureQuickButton();

            try {
                var cardObserver = new MutationObserver(function () {
                    ensureQuickButton();
                });
                cardObserver.observe(container[0], { childList: true });

                if (e.object && e.object.activity) {
                    var act = e.object.activity;
                    var origDestroy = act.onDestroy;
                    act.onDestroy = function () {
                        try { cardObserver.disconnect(); } catch (err) {}
                        if (typeof origDestroy === 'function') origDestroy.apply(this, arguments);
                    };
                }
            } catch (e) {}

            // Also register in Lampa's internal source container so Watch button lists them
            var hiddenContainer = render.find('.buttons--container');
            if (!hiddenContainer.length) hiddenContainer = $('.buttons--container');
            if (hiddenContainer.length) {
                if (!hiddenContainer.find('.button--source-vk').length) {
                    var sVk = $('<div class="full-start__button selector button--source-vk" data-subtitle="VK Видео (Без рекламы)"><span>VK Видео (Без рекламы)</span></div>');
                    sVk.on('hover:enter', function () { btnVk.trigger('hover:enter'); });
                    hiddenContainer.append(sVk);
                }
                if (!hiddenContainer.find('.button--source-rt').length) {
                    var sRt = $('<div class="full-start__button selector button--source-rt" data-subtitle="Rutube (Без рекламы)"><span>Rutube (Без рекламы)</span></div>');
                    sRt.on('hover:enter', function () { btnRt.trigger('hover:enter'); });
                    hiddenContainer.append(sRt);
                }
                if (!hiddenContainer.find('.button--source-kf').length) {
                    var sKf = $('<div class="full-start__button selector button--source-kf" data-subtitle="KinoFlix P2P TorrServer"><span>KinoFlix P2P</span></div>');
                    sKf.on('hover:enter', function () { btnKf.trigger('hover:enter'); });
                    hiddenContainer.append(sKf);
                }
            }
        });
    }

    if (window.appready) {
        allInOnePlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') allInOnePlugin();
        });
    }
})();
