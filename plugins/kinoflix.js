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

    function pickEpisode(movie, onTargetReady) {
        var isTv = !!(movie.first_air_date || movie.seasons || movie.number_of_seasons);
        var title = movie.title || movie.name || '';
        var year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
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

    function kinoflixPlugin() {
        initSettings();

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data.movie;
            var title = movie.title || movie.name || '';
            var render = e.object.activity.render();
            var container = $('.full-start-new__buttons', render);
            if (!container.length) container = $('.full-start__buttons', render);
            if (!container.length) return;

            if (container.find('.button--kinoflix-p2p').length) return;

            var btn = $(`
                <div class="full-start__button selector button--kinoflix-p2p" style="background: rgba(229, 9, 20, 0.25); border: 1px solid rgba(229, 9, 20, 0.7);">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                    </svg>
                    <span>KinoFlix P2P (Раздачи)</span>
                </div>
            `);

            btn.on('hover:enter', function () {
                pickEpisode(movie, function (target) {
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
                            if (!torrents || !torrents.length) {
                                Lampa.Noty.show('Раздач в KinoFlix не найдено');
                                return;
                            }

                            var selectItems = torrents.map(function (item) {
                                var seeds = item.seeders || item.seeds || 0;
                                var size = item.size || '';
                                var quality = item.quality || '';
                                var badge = item.badge || '';
                                var displayTitle = (badge ? badge + ' ' : '') + item.title;
                                var subParts = [];
                                if (quality) subParts.push(quality);
                                if (size) subParts.push(size);
                                subParts.push('🌱 ' + seeds + ' сидов');
                                if (item.badge_note) subParts.push(item.badge_note);

                                return {
                                    title: displayTitle,
                                    subtitle: subParts.join(' • '),
                                    raw: item,
                                    rank: item.rank || 50
                                };
                            });

                            selectItems.sort(function (a, b) {
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
                                items: selectItems,
                                onSelect: function (selected) {
                                    Lampa.Noty.show('Запуск P2P стриминга TorrServer...');
                                    if (Lampa.Loading) Lampa.Loading.start(function () {});

                                    var prepUrl = server + '/api/stream/prepare';
                                    var payload = {
                                        link: selected.raw.link || selected.raw.magnet || '',
                                        magnet: selected.raw.magnet || '',
                                        title: selected.raw.title,
                                        topic_id: selected.raw.topic_id ? String(selected.raw.topic_id) : undefined,
                                        season: target.targetSeason,
                                        episode: target.targetEpisode,
                                        duration: target.duration || undefined
                                    };

                                    $.ajax({
                                        url: prepUrl,
                                        type: 'POST',
                                        contentType: 'application/json',
                                        data: JSON.stringify(payload),
                                        timeout: 20000,
                                        success: function (prepData) {
                                            if (Lampa.Loading) Lampa.Loading.stop();
                                            if (prepData && (prepData.stream_url || prepData.url)) {
                                                var playUrl = prepData.stream_url || prepData.url;
                                                if (playUrl.startsWith('/')) playUrl = server + playUrl;
                                                var totalDur = prepData.duration || target.duration || 5400;
                                                var playTitle = (target.isTv && target.targetEpisode ? (title + ' (S' + target.targetSeason + ' E' + target.targetEpisode + ')') : selected.raw.title);
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
                                            Lampa.Noty.show('Не удалось запустить P2P поток на сервере');
                                        }
                                    });
                                }
                            });
                        },
                        error: function () {
                            if (Lampa.Loading) Lampa.Loading.stop();
                            Lampa.Noty.show('Ошибка запроса к серверу KinoFlix');
                        }
                    });
                });
            });

            container.append(btn);
        });
    }

    if (window.appready) {
        kinoflixPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') kinoflixPlugin();
        });
    }
})();
