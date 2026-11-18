(function () {
    'use strict';

    var defaultServer = 'http://127.0.0.1:7890';
    try {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].src || '';
            if (src.indexOf('/plugins/') !== -1) {
                var u = new URL(src);
                defaultServer = u.protocol + '//' + u.host;
                break;
            }
        }
    } catch (e) {}

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
                    description: 'IP и порт бэкенда (например, http://192.168.1.2:7890)'
                }
            });
        }
    }

    function formatDuration(sec) {
        if (!sec || isNaN(sec)) return '';
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = Math.floor(sec % 60);
        if (h > 0) return h + 'ч ' + m + 'м';
        return m + ' мин';
    }

    function parseVideoTitle(titleText, durStr, targetSeason, targetEpisode, isSeries) {
        var lower = (titleText || '').toLowerCase();
        var isTrailer = false;
        var trailerWords = ['трейлер', 'тизер', 'обзор', 'клип', 'фрагмент', 'отрывок', 'саундтрек', 'прохождение', 'геймплей', 'gameplay', 'letsplay', 'фильм о фильме', 'trailer', 'teaser'];
        for (var i = 0; i < trailerWords.length; i++) {
            if (lower.indexOf(trailerWords[i]) !== -1) {
                isTrailer = true;
                break;
            }
        }

        var durationSec = 0;
        if (durStr) {
            var parts = durStr.split(':').map(Number);
            if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
        }
        if (durationSec > 0 && durationSec < 600 && isSeries) isTrailer = true;

        if (isTrailer) {
            return {
                badge: '🔴 [ОБЗОР / ТРЕЙЛЕР]',
                rank: 10,
                note: 'Не является полной серией'
            };
        }

        var isFullSeason = /(?:все\s*серии|весь\s*сезон|сезон\s*целиком|\d+-\d+\s*сери[яи])/i.test(titleText) || durationSec > 10800;
        if (isFullSeason) {
            return {
                badge: '🔵 [ВЕСЬ СЕЗОН]',
                rank: 80,
                note: 'Сборник всех серий'
            };
        }

        if (isSeries && targetEpisode !== null && targetEpisode !== undefined) {
            var foundSeason = null;
            var foundEpisode = null;

            var mX = titleText.match(/\b0*(\d{1,2})[xх]0*(\d{1,3})\b/i);
            if (mX) {
                foundSeason = parseInt(mX[1], 10);
                foundEpisode = parseInt(mX[2], 10);
            } else {
                var mS = titleText.match(/(?:s0*(\d{1,2})|\b(\d{1,2})(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий)?\s*[-–]?\s*(?:сезон|сезона|season)|\b(?:сезон|season)\s*[-–]?\s*0*(\d{1,2}))/i);
                if (mS) foundSeason = parseInt(mS[1] || mS[2] || mS[3], 10);

                var mE = titleText.match(/(?:e0*(\d{1,3})|\b(\d{1,3})(?:-?[яйеуюи]|-?ая|-?ый|-?ой|-?ий|-?ья)?\s*[-–]?\s*(?:сери[яие]|эпизод|выпуск|ep|episode)|\b(?:сери[яие]|эпизод|выпуск|ep|episode)\s*[-–]?\s*0*(\d{1,3}))/i);
                if (mE) foundEpisode = parseInt(mE[1] || mE[2] || mE[3], 10);
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

        return { badge: '', rank: 60, note: '' };
    }

    function pickEpisode(movie, onTargetReady) {
        var isTv = !!(movie.first_air_date || movie.seasons || movie.number_of_seasons);
        var title = movie.title || movie.name || '';
        var year = (movie.release_date || movie.first_air_date || '').slice(0, 4);

        if (!isTv) {
            var q = title;
            if (year) q += ' ' + year;
            return onTargetReady({
                isTv: false,
                query: q,
                targetSeason: null,
                targetEpisode: null,
                dialogTitle: title
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
                            dialogTitle: title
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
                                    dialogTitle: title + (selEp.episode ? ' (S' + selEp.season + ' E' + selEp.episode + ')' : ' (Сезон ' + selEp.season + ')')
                                });
                            }, 50);
                        }
                    });
                }, 50);
            }
        });
    }

    function vkPlugin() {
        initSettings();

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data.movie;
            var render = e.object.activity.render();
            var container = $('.full-start-new__buttons', render);
            if (!container.length) container = $('.full-start__buttons', render);
            if (!container.length) return;

            if (container.find('.button--vk-clean').length) return;

            var btn = $(`
                <div class="full-start__button selector button--vk-clean" style="background: rgba(0, 119, 255, 0.25); border: 1px solid rgba(0, 119, 255, 0.7);">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.38 12.83h-1.6c-.6 0-.78-.48-1.85-1.55-.93-.9-1.34-1.02-1.57-1.02-.32 0-.41.09-.41.53v1.44c0 .38-.12.6-.1.6h-1.4c-2.3 0-4.83-2.1-6.62-5.41-.09-.17-.18-.36-.26-.56-.12-.3-.02-.45.3-.45h1.6c.41 0 .56.19.72.63.78 2.27 2.1 4.26 2.65 4.26.2 0 .3-.09.3-.6V10.1c-.06-1.1-.64-1.2-.64-1.59 0-.19.16-.38.42-.38h2.52c.35 0 .47.19.47.61v3.31c0 .35.15.47.26.47.2 0 .38-.12.77-.51 1.2-1.34 2.05-3.41 2.05-3.41.11-.23.32-.47.74-.47h1.6c.48 0 .58.25.48.6-.2 0-.91 1.62-2.1 2.97-.52.59-.72.86 0 1.57.51.52 1.48 1.45 1.77 2.08.22.46-.07.89-.5.89z"/>
                    </svg>
                    <span>VK Видео (Без рекламы)</span>
                </div>
            `);

            btn.on('hover:enter', function () {
                pickEpisode(movie, function (target) {
                    Lampa.Noty.show('Поиск в VK Видео: ' + target.query);
                    if (Lampa.Loading) Lampa.Loading.start(function () {});

                    var server = getServerUrl();
                    var searchUrl = server + '/api/online/vk?query=' + encodeURIComponent(target.query);
                    if (target.targetSeason) searchUrl += '&season=' + encodeURIComponent(target.targetSeason);
                    if (target.targetEpisode) searchUrl += '&episode=' + encodeURIComponent(target.targetEpisode);

                    $.ajax({
                        url: searchUrl,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 10000,
                        success: function (results) {
                            if (Lampa.Loading) Lampa.Loading.stop();

                            if (!results || !results.length) {
                                Lampa.Noty.show('В VK Видео ничего не найдено');
                                return;
                            }

                            var selectItems = results.map(function (item) {
                                var durStr = item.duration_str || (item.duration ? formatDuration(item.duration) : '');
                                var analysis = parseVideoTitle(item.title, durStr, target.targetSeason, target.targetEpisode, target.isTv);
                                var badge = item.badge || analysis.badge || '';
                                var displayTitle = (badge ? badge + ' ' : '') + item.title;
                                var subParts = [];
                                if (durStr) subParts.push('⏱ ' + durStr);
                                if (item.author) subParts.push(item.author);
                                if (item.note || analysis.note) subParts.push(item.note || analysis.note);

                                return {
                                    title: displayTitle,
                                    subtitle: subParts.join(' • '),
                                    raw: item,
                                    rank: (item.rank !== undefined ? item.rank : analysis.rank)
                                };
                            });

                            selectItems.sort(function (a, b) { return b.rank - a.rank; });

                            Lampa.Select.show({
                                title: 'VK Видео: ' + target.dialogTitle,
                                items: selectItems,
                                onSelect: function (selected) {
                                    if (selected.rank <= 30) {
                                        Lampa.Noty.show('Внимание: это не запрошенная серия!');
                                    }
                                    Lampa.Noty.show('Извлечение чистого потока VK...');
                                    if (Lampa.Loading) Lampa.Loading.start(function () {});

                                    var streamUrl = server + '/api/online/vk/stream?id=' + encodeURIComponent(selected.raw.id);
                                    $.ajax({
                                        url: streamUrl,
                                        type: 'GET',
                                        dataType: 'json',
                                        timeout: 15000,
                                        success: function (streamData) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            if (streamData && streamData.stream_url) {
                                                var playUrl = streamData.stream_url;
                                                if (playUrl.startsWith('/')) playUrl = server + playUrl;
                                                Lampa.Player.play({
                                                    url: playUrl,
                                                    title: selected.raw.title,
                                                    timeline: {
                                                        hash: Lampa.Utils.hash(selected.raw.id)
                                                    }
                                                });
                                            } else {
                                                Lampa.Noty.show('Не удалось извлечь видеопоток VK');
                                            }
                                        },
                                        error: function (xhr) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            var msg = 'Ошибка соединения с сервером VK Видео';
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
                            Lampa.Noty.show('Ошибка поиска на сервере KinoFlix');
                        }
                    });
                });
            });

            container.append(btn);
        });
    }

    if (window.appready) {
        vkPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') vkPlugin();
        });
    }
})();
