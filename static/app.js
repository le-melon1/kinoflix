// --- NETFLIX 1-IN-1 APPLICATION LOGIC ---

const state = {
  catalog: null,
  activeMovie: null,
  activeTorrentHash: null,
  currentStreamUrl: null,
  videoFiles: [],
  activeFileIndex: 0,
  seasons: {},
  currentModalSeason: '1',
  currentDrawerSeason: '1',
  modalTorrentItem: null,
  modalTorrentData: null,
  modalSeasons: {},
  modalVideoFiles: [],
  audioMode: 'aac', // 'aac' or 'direct'
  activeAudioTrack: 0,
  audioTracks: [],
  mediaDuration: 0,
  currentSeekOffset: 0,
  nextEpCountdownTimer: null,
  pendingNextFile: null,
  currentSource: 'all',
  searchTimeout: null,
  controlsTimeout: null,
  statsInterval: null,
  rutrackerLoggedIn: false,
  tvMode: false,
  tvCategory: 'all',
  tvItems: [],
  tvPageIndex: 0,
  tvFocusIndex: 0
};

// DOM Elements
const netflixHeader = document.getElementById('netflixHeader');
const searchBox = document.getElementById('searchBox');
const netflixSearchInput = document.getElementById('netflixSearchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const homeView = document.getElementById('homeView');
const searchResultsView = document.getElementById('searchResultsView');
const searchQueryLabel = document.getElementById('searchQueryLabel');
const searchLoader = document.getElementById('searchLoader');
const searchGrid = document.getElementById('searchGrid');
const downloadsView = document.getElementById('downloadsView');
const downloadsGrid = document.getElementById('downloadsGrid');
const tvView = document.getElementById('tvView');
const tvCardsGrid = document.getElementById('tvCardsGrid');
const tvPageInfo = document.getElementById('tvPageInfo');
const tvModeBtnText = document.getElementById('tvModeBtnText');
const tvTabsBar = document.getElementById('tvTabsBar');

// Billboard DOM
const billboardImg = document.getElementById('billboardImg');
const billboardTitle = document.getElementById('billboardTitle');
const billboardMatch = document.getElementById('billboardMatch');
const billboardYear = document.getElementById('billboardYear');
const billboardAge = document.getElementById('billboardAge');
const billboardDuration = document.getElementById('billboardDuration');
const billboardQuality = document.getElementById('billboardQuality');
const billboardAudio = document.getElementById('billboardAudio');
const billboardPlot = document.getElementById('billboardPlot');
const rowsContainer = document.getElementById('rowsContainer');

// Modal DOM
const movieDetailModal = document.getElementById('movieDetailModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalMatch = document.getElementById('modalMatch');
const modalYear = document.getElementById('modalYear');
const modalAge = document.getElementById('modalAge');
const modalQuality = document.getElementById('modalQuality');
const modalAudio = document.getElementById('modalAudio');
const modalPlot = document.getElementById('modalPlot');
const modalGenres = document.getElementById('modalGenres');
const modalRating = document.getElementById('modalRating');
const modalEpisodesSection = document.getElementById('modalEpisodesSection');
const seasonSelect = document.getElementById('seasonSelect');
const modalEpisodeCount = document.getElementById('modalEpisodeCount');
const modalEpisodesGrid = document.getElementById('modalEpisodesGrid');
const modalEditionsList = document.getElementById('modalEditionsList');

// Player DOM
const netflixPlayerView = document.getElementById('netflixPlayerView');
const netflixViewport = document.getElementById('netflixViewport');
const netflixVideo = document.getElementById('netflixVideo');
const playerSpinner = document.getElementById('playerSpinner');
const spinnerText = document.getElementById('spinnerText');
const playerTitle = document.getElementById('playerTitle');
const playerSubtitle = document.getElementById('playerSubtitle');
const playBtn = document.getElementById('playBtn');
const nPlayIcon = document.getElementById('nPlayIcon');
const nPauseIcon = document.getElementById('nPauseIcon');
const playerVolumeSlider = document.getElementById('playerVolumeSlider');
const nVolHigh = document.getElementById('nVolHigh');
const nVolMute = document.getElementById('nVolMute');
const playerCurrentTime = document.getElementById('playerCurrentTime');
const playerDuration = document.getElementById('playerDuration');
const playerProgressPlayed = document.getElementById('playerProgressPlayed');
const playerProgressBuffered = document.getElementById('playerProgressBuffered');
const playerScrubberHandle = document.getElementById('playerScrubberHandle');
const playerHoverTime = document.getElementById('playerHoverTime');
const playerHealthText = document.getElementById('playerHealthText');
const playerNextEpBtn = document.getElementById('playerNextEpBtn');
const playerEpisodesMenuBtn = document.getElementById('playerEpisodesMenuBtn');
const playerEpisodesDrawer = document.getElementById('playerEpisodesDrawer');
const drawerSeasonSelect = document.getElementById('drawerSeasonSelect');
const playerEpisodesList = document.getElementById('playerEpisodesList');
const playerAudioBtn = document.getElementById('playerAudioBtn');
const playerAudioMenu = document.getElementById('playerAudioMenu');
const audioModeAac = document.getElementById('audioModeAac');
const audioModeDirect = document.getElementById('audioModeDirect');
const audioTracksHeader = document.getElementById('audioTracksHeader');
const audioTracksList = document.getElementById('audioTracksList');
const playerSpeedBtn = document.getElementById('playerSpeedBtn');
const playerSpeedText = document.getElementById('playerSpeedText');
const playerSpeedMenu = document.getElementById('playerSpeedMenu');
const nextEpToast = document.getElementById('nextEpToast');
const nextEpTimer = document.getElementById('nextEpTimer');
const nextEpTitle = document.getElementById('nextEpTitle');

// Status Pills
const rtDot = document.getElementById('rtDot');
const rtText = document.getElementById('rtText');

// --- UTILITY & SVG GENERATOR ---
function escapeJs(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateCardSvg(title, year, quality) {
  const t = escapeXml((title || 'KinoFlix').slice(0, 24));
  const y = escapeXml(year || '2024');
  const q = escapeXml(quality || 'HD');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170" viewBox="0 0 300 170">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1f1f1f"/>
        <stop offset="50%" stop-color="#141414"/>
        <stop offset="100%" stop-color="#0a0a0a"/>
      </linearGradient>
      <linearGradient id="redG" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E50914"/>
        <stop offset="100%" stop-color="#B20710"/>
      </linearGradient>
    </defs>
    <rect width="300" height="170" fill="url(#g)"/>
    <circle cx="150" cy="70" r="30" fill="#222" stroke="#333" stroke-width="2"/>
    <polygon points="145,58 162,70 145,82" fill="#E50914"/>
    <rect x="14" y="14" width="46" height="18" rx="3" fill="url(#redG)"/>
    <text x="37" y="27" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${q}</text>
    <text x="150" y="125" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${t}</text>
    <text x="150" y="145" fill="#888888" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="11" text-anchor="middle">${y} • KinoFlix</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function getEffectiveDuration() {
  if (state.mediaDuration && state.mediaDuration > 0) {
    return state.mediaDuration;
  }
  const vidDur = netflixVideo.duration;
  if (vidDur && !isNaN(vidDur) && isFinite(vidDur) && vidDur > 30) {
    return vidDur;
  }
  return 5400; // fallback 1h 30m
}

function getEffectiveCurrentTime() {
  const vidCur = (netflixVideo && !isNaN(netflixVideo.currentTime)) ? netflixVideo.currentTime : 0;
  return (state.currentSeekOffset || 0) + vidCur;
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
  checkRuTrackerStatus();
  setupScrollHeader();
  setupPlayerEventListeners();
  setupKeyboardShortcuts();

  const savedTv = localStorage.getItem('kinoflix_tv_mode') === 'true';
  if (savedTv) {
    setTvMode(true);
  }

  window.addEventListener('beforeunload', () => {
    if (state.activeTorrentHash) {
      navigator.sendBeacon('/api/stream/stop', JSON.stringify({ torrent_hash: state.activeTorrentHash }));
    }
  });
});

// Header scroll effect
function setupScrollHeader() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      netflixHeader.classList.add('scrolled');
    } else {
      netflixHeader.classList.remove('scrolled');
    }
  });
}

// --- CATALOG LOADING ---
async function loadCatalog() {
  try {
    const res = await fetch('/api/catalog');
    state.catalog = await res.json();

    if (state.catalog.genres) {
      renderGenreFilterBar(state.catalog.genres);
      renderTvTabs(state.catalog.genres);
    }

    if (state.tvMode) {
      refreshTvItems();
    } else {
      if (state.catalog.billboard) {
        renderBillboard(state.catalog.billboard);
      }
      if (state.catalog.categories) {
        renderRows(state.catalog.categories);
      }
    }
  } catch (err) {
    console.error('Catalog load error:', err);
  }
}

function renderGenreFilterBar(genres) {
  const bar = document.getElementById('genreFilterBar');
  if (!bar || !genres) return;
  bar.innerHTML = genres.map(g => `
    <button class="genre-pill ${g.id === 'all' ? 'active' : ''}" data-genre="${g.id}" onclick="switchCategory('${g.id}')">
      <span>${g.icon || '🎬'}</span>
      <span>${escapeHtml(g.name)}</span>
    </button>
  `).join('');
}

function renderTvTabs(genres) {
  const bar = document.getElementById('tvTabsBar');
  if (!bar || !genres) return;
  const list = [...genres];
  if (!list.find(i => i.id === 'downloads')) {
    list.push({ id: 'downloads', name: 'Загрузки', icon: '💾' });
  }
  bar.innerHTML = list.map(g => `
    <button class="tv-tab ${g.id === state.tvCategory ? 'active' : ''}" data-tv-cat="${g.id}" onclick="switchTvCategory('${g.id}')">
      ${g.icon || ''} ${escapeHtml(g.name)}
    </button>
  `).join('');
}

function renderBillboard(item) {
  state.billboardMovie = item;
  billboardImg.onerror = () => { billboardImg.src = generateCardSvg(item.title, item.year, item.quality); };
  billboardImg.src = item.backdrop;
  billboardTitle.textContent = item.title.toUpperCase();
  billboardMatch.textContent = item.match || '98% совпадение';
  billboardYear.textContent = item.year || '2024';
  billboardAge.textContent = item.age || '16+';
  billboardDuration.textContent = item.duration || '2 ч 15 мин';
  billboardQuality.textContent = item.quality || 'Ultra HD 4K';
  billboardAudio.textContent = item.audio ? '5.1' : 'Стерео';
  billboardPlot.textContent = item.plot;
}

function renderRows(categories) {
  rowsContainer.innerHTML = categories.map(cat => {
    if (cat.is_top10) {
      return `
        <div class="netflix-row">
          <div class="row-header">
            <h2 class="row-title">${cat.title}</h2>
          </div>
          <div class="row-carousel">
            ${cat.items.map((item, idx) => `
              <div class="top10-card" onclick="openMovieDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="top10-number">${idx + 1}</div>
                <div class="top10-poster-wrap">
                  <img src="${item.poster}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${item.year || ''}', '${item.quality || '4K'}');">
                  <div class="top10-title-bar">${escapeHtml(item.title)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="netflix-row">
        <div class="row-header">
          <h2 class="row-title">${cat.title}</h2>
        </div>
        <div class="row-carousel">
          ${cat.items.map(item => `
            <div class="netflix-card" onclick="openMovieDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
              <img src="${item.backdrop || item.poster}" alt="${escapeHtml(item.title)}" class="card-backdrop-img" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${item.year || ''}', '${item.quality || 'HD'}');">
              <div class="card-overlay-hover">
                <div class="card-title-mini">${escapeHtml(item.title)}</div>
                <div class="card-meta-mini">
                  <span style="color:var(--match-green); font-weight:700;">${item.match || '98%'}</span>
                  <span class="age-badge">${item.age || '16+'}</span>
                  <span class="quality-badge">${item.quality || 'HD'}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// --- SEARCH HANDLING ---
function toggleSearchInput() {
  const isOpen = searchBox.classList.contains('open');
  if (!isOpen) {
    searchBox.classList.add('open');
    netflixSearchInput.focus();
  } else if (!netflixSearchInput.value) {
    searchBox.classList.remove('open');
  }
}

function handleSearchInput(query) {
  clearTimeout(state.searchTimeout);
  const q = query.trim();
  searchClearBtn.style.display = q ? 'block' : 'none';

  if (!q) {
    goHome();
    return;
  }

  state.searchTimeout = setTimeout(() => {
    performSearch(q);
  }, 350);
}

function clearSearch() {
  netflixSearchInput.value = '';
  searchClearBtn.style.display = 'none';
  goHome();
}

function goHome() {
  if (state.tvMode) {
    homeView.style.display = 'none';
    searchResultsView.style.display = 'none';
    if (downloadsView) downloadsView.style.display = 'none';
    if (tvView) tvView.style.display = 'block';
    refreshTvItems();
    return;
  }
  homeView.style.display = 'block';
  searchResultsView.style.display = 'none';
  if (downloadsView) downloadsView.style.display = 'none';
  if (tvView) tvView.style.display = 'none';
  searchBox.classList.remove('open');
}

async function openDownloadsView() {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const dlNav = document.getElementById('navDownloads');
  if (dlNav) dlNav.classList.add('active');

  homeView.style.display = 'none';
  searchResultsView.style.display = 'none';
  if (tvView) tvView.style.display = 'none';
  downloadsView.style.display = 'block';

  await loadDownloadsList();
}

async function loadDownloadsList() {
  if (!downloadsGrid) return;
  downloadsGrid.innerHTML = `
    <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #888;">
      <div class="netflix-spinner-circle" style="width:36px; height:36px; margin:0 auto 10px;"></div>
      Загрузка списка скачанных файлов...
    </div>
  `;
  try {
    const res = await fetch('/api/downloads/list');
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      downloadsGrid.innerHTML = `
        <div style="grid-column: 1/-1; padding: 50px 20px; text-align: center; color: #777;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📂</div>
          <h3 style="color:#aaa; font-size:1.2rem; margin-bottom:8px;">Папка пока пуста</h3>
          <p style="font-size:0.95rem; max-width:500px; margin:0 auto 20px;">
            Вы можете скачать любой фильм или серию на диск, нажав кнопку <strong>«💾 Скачать на диск»</strong> в карточке фильма.
          </p>
          <button class="n-secondary-btn" onclick="openDownloadsFinder()" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:8px 18px; border-radius:4px; cursor:pointer;">
            Открыть папку в Finder
          </button>
        </div>
      `;
      return;
    }

    downloadsGrid.innerHTML = items.map(it => `
      <div class="download-card">
        <div>
          <div class="download-card-title">${escapeHtml(it.title)}</div>
          <div class="download-card-meta">
            <span>💾 ${it.size_str}</span>
            <span style="margin-left: 10px; color: ${it.is_complete ? '#46d369' : '#e5a00d'};">
              ${it.is_complete ? '✔ Скачан' : '⏳ Загрузка...'}
            </span>
          </div>
        </div>
        <div class="download-card-actions">
          <button class="n-edition-play-btn" onclick="playLocalDownload('${escapeJs(it.filename)}', '${escapeJs(it.title)}')" style="flex: 2;">
            ▶ Смотреть
          </button>
          <button class="n-secondary-btn" onclick="deleteDownloadedFile('${escapeJs(it.filename)}')" style="background: rgba(229,9,20,0.2); border: 1px solid rgba(229,9,20,0.4); color: #ff6b6b; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
            🗑
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    downloadsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #ff6b6b; padding: 20px;">Ошибка загрузки: ${err.message}</div>`;
  }
}

async function openDownloadsFinder() {
  try {
    await fetch('/api/downloads/open-folder', { method: 'POST' });
  } catch (e) {
    console.error(e);
  }
}

async function deleteDownloadedFile(filename) {
  if (!confirm(`Удалить файл "${filename}" с диска?`)) return;
  try {
    await fetch(`/api/downloads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    loadDownloadsList();
  } catch (e) {
    alert('Ошибка удаления: ' + e.message);
  }
}

function playLocalDownload(filename, title) {
  const url = `/api/downloads/play/${encodeURIComponent(filename)}`;
  netflixPlayerView.style.display = 'flex';
  playerTitle.textContent = title || filename;
  netflixVideo.src = url;
  netflixVideo.muted = false;
  netflixVideo.load();
  netflixVideo.play().catch(e => console.log('Local play error:', e));
}

async function saveActiveMovieToDisk() {
  const btn = document.getElementById('modalSaveDownloadBtn');
  if (btn) btn.innerHTML = '⏳ Добавление...';

  try {
    const torrentHash = state.modalTorrentData?.hash || state.activeTorrentHash;
    const fileId = state.modalTorrentData?.default_index || 1;
    const rawTitle = state.activeMovie?.title || 'movie';
    const filename = `${rawTitle.replace(/[/\\?%*:|"<>]/g, '_')}.mp4`;

    const res = await fetch('/api/downloads/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        torrent_hash: torrentHash,
        file_id: fileId,
        filename: filename,
        title: rawTitle
      })
    });
    if (btn) btn.innerHTML = '✔ Загрузка начата';
    setTimeout(() => { if (btn) btn.innerHTML = '💾 Скачать на диск'; }, 3000);
    alert(`Фильм "${rawTitle}" добавлен в загрузки (~/Downloads/KinoFlix)! Вы можете найти его во вкладке «Загрузки».`);
  } catch (err) {
    if (btn) btn.innerHTML = '💾 Скачать на диск';
    alert('Ошибка скачивания: ' + err.message);
  }
}

function switchCategory(cat) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const links = document.querySelectorAll('.nav-link');
  if (cat === 'all' && links[0]) links[0].classList.add('active');
  if (cat === 'series' && links[1]) links[1].classList.add('active');
  if (cat === 'movies' && links[2]) links[2].classList.add('active');
  if ((cat === 'trending' || cat === 'new_releases') && links[3]) links[3].classList.add('active');

  goHome();

  if (!state.catalog) return;

  const cats = state.catalog.categories || [];
  let filteredCats = [];
  let billboardItem = state.catalog.billboard;

  if (cat === 'series') {
    filteredCats = cats.filter(c => c.id === 'series' || c.title.toLowerCase().includes('сериал'));
    const allSeries = cats.flatMap(c => c.items || []).filter(item => item.is_series);
    if (allSeries.length > 0) {
      billboardItem = allSeries[0];
      if (filteredCats.length === 0) {
        filteredCats = [{ id: 'series', title: 'Популярные сериалы', items: allSeries }];
      }
    }
  } else if (cat === 'movies') {
    filteredCats = cats.filter(c => c.id !== 'series' && !c.title.toLowerCase().includes('сериал'));
    const allMovies = cats.flatMap(c => c.items || []).filter(item => !item.is_series);
    if (allMovies.length > 0) {
      billboardItem = allMovies[0];
    }
  } else if (cat === 'trending') {
    filteredCats = cats.filter(c => c.id === 'trending' || c.is_top10);
    billboardItem = state.catalog.billboard;
  } else if (cat === 'all') {
    filteredCats = cats;
    billboardItem = state.catalog.billboard;
  } else {
    // Exact genre ID match from ALL_GENRES
    const matched = cats.find(c => c.id === cat);
    if (matched) {
      filteredCats = [matched];
      if (matched.items && matched.items.length > 0) {
        billboardItem = matched.items[0];
      }
    } else {
      filteredCats = cats;
      billboardItem = state.catalog.billboard;
    }
  }

  // Update active pill styling
  document.querySelectorAll('.genre-pill').forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-genre') === cat);
  });

  if (billboardItem) renderBillboard(billboardItem);
  renderRows(filteredCats);
}

async function performSearch(query) {
  homeView.style.display = 'none';
  searchResultsView.style.display = 'block';
  searchQueryLabel.textContent = `"${query}"`;
  searchLoader.style.display = 'block';
  searchGrid.innerHTML = '';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${state.currentSource}`);
    const data = await res.json();
    searchLoader.style.display = 'none';

    renderSearchResults(data);
  } catch (err) {
    searchLoader.style.display = 'none';
    searchGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;">Ошибка поиска: ${err.message}</div>`;
  }
}

function setSource(source) {
  state.currentSource = source;
  const q = netflixSearchInput.value.trim();
  if (q) performSearch(q);
}

function renderSearchResults(data) {
  const results = data.results || [];
  const movie = data.movie || {};
  const verified = data.verified_editions || [];

  if (!results.length) {
    searchGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; color:#aaa;">
        <h3>Ничего не найдено</h3>
        <p>Попробуйте уточнить название или проверьте статус подключения.</p>
      </div>`;
    return;
  }

  // Render individual release cards with distinct covers and always-visible titles
  let html = results.map(item => {
    const cardTitle = item.display_title || item.title;
    const cardYear = item.display_year || item.year || '';
    // Prefer widescreen 16:9 backdrop so there is zero cropping on landscape cards
    const cardImg = item.backdrop || item.poster || generateCardSvg(cardTitle, cardYear, item.quality || 'HD');
    return `
      <div class="grid-card" onclick="openTorrentReleaseModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
        <div class="grid-card-poster-wrap">
          <img src="${cardImg}" class="grid-card-poster-img" alt="${escapeHtml(cardTitle)}" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(cardTitle)}', '${escapeJs(cardYear)}', '${escapeJs(item.quality || 'HD')}');">
          <div class="grid-card-hover-overlay">
            <div class="grid-play-icon">▶</div>
          </div>
          <span class="grid-quality-pill">${escapeHtml(item.quality || 'HD')}</span>
          <span class="grid-source-pill">${escapeHtml(item.source)}</span>
          <div class="grid-card-title-bar">${escapeHtml(cardTitle)}${cardYear ? ` (${escapeHtml(cardYear)})` : ''}</div>
        </div>
        <div class="grid-card-body">
          <div class="grid-card-meta">
            <span style="color:var(--match-green); font-weight:800; background:rgba(70,211,105,0.15); padding:2px 8px; border-radius:4px;">▲ ${item.seeds} сидов</span>
            <span style="color:#aaa;">💾 ${item.size}</span>
            <span style="color:#888;">${item.quality || 'HD'}</span>
          </div>
          <div class="grid-card-raw-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        </div>
      </div>
    `;
  }).join('');

  searchGrid.innerHTML = html;
}

// --- NETFLIX DETAIL & EDITIONS MODAL ---
function playBillboardMovie() {
  if (state.billboardMovie) {
    openMovieDetails(state.billboardMovie);
  }
}

function openBillboardDetails() {
  if (state.billboardMovie) {
    openMovieDetails(state.billboardMovie);
  }
}

async function openMovieDetails(movie) {
  state.activeMovie = movie;
  modalBackdrop.onerror = () => { modalBackdrop.src = generateCardSvg(movie.title, movie.year, movie.quality); };
  modalBackdrop.src = movie.backdrop || movie.poster;
  modalTitle.textContent = movie.title;
  modalMatch.textContent = movie.match || '98% совпадение';
  modalYear.textContent = movie.year || '2024';
  modalAge.textContent = movie.age || '16+';
  modalQuality.textContent = movie.quality || 'Ultra HD 4K';
  modalAudio.textContent = movie.audio ? 'Dolby 5.1' : 'Стерео';
  modalPlot.textContent = movie.plot || 'Описание фильма...';
  modalGenres.textContent = `Жанры: ${movie.genre || 'Фильм'}`;
  modalRating.textContent = `★ ${movie.rating || '8.8'} / 10`;

  modalEpisodesSection.style.display = 'none';
  modalEditionsList.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">Загрузка проверенных раздач с RuTracker...</div>';
  movieDetailModal.style.display = 'flex';

  // Search live torrents for this movie
  const q = movie.search_query || movie.title;
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&source=all`);
    const data = await res.json();
    const verified = data.verified_editions || [];
    const results = data.results || [];
    renderModalEditions(verified, results);

    // If series, load episodes from best release
    const top = verified[0] || results[0];
    const isSeries = movie.is_series || (top && (top.title.toLowerCase().includes('сезон') || top.title.toLowerCase().includes('сери') || top.title.toLowerCase().includes('s0')));
    if (isSeries && top) {
      loadEpisodesForModal(top, movie);
    }
  } catch (err) {
    modalEditionsList.innerHTML = `<div style="color:#888;">Ошибка загрузки раздач: ${err.message}</div>`;
  }
}

function openMovieDetailsWithTorrents(movie, verified, allResults) {
  state.activeMovie = movie;
  modalBackdrop.src = movie.poster;
  modalTitle.textContent = movie.title;
  modalMatch.textContent = `${movie.rating || '8.7'} IMDb`;
  modalYear.textContent = movie.year || '2024';
  modalAge.textContent = '16+';
  modalQuality.textContent = '4K UHD';
  modalAudio.textContent = 'Дубляж';
  modalPlot.textContent = movie.plot || '';
  modalGenres.textContent = `Жанры: ${movie.genre || 'Фильм'}`;
  modalRating.textContent = `★ ${movie.rating || '8.7'} / 10`;

  modalEpisodesSection.style.display = 'none';
  movieDetailModal.style.display = 'flex';
  renderModalEditions(verified, allResults);

  const top = (verified && verified[0]) || (allResults && allResults[0]);
  const isSeries = movie.is_series || (top && (top.title.toLowerCase().includes('сезон') || top.title.toLowerCase().includes('сери') || top.title.toLowerCase().includes('s0')));
  if (isSeries && top) {
    loadEpisodesForModal(top, movie);
  }
}

async function loadEpisodesForModal(item, movie) {
  modalEpisodesSection.style.display = 'block';
  modalEpisodesGrid.innerHTML = `
    <div style="padding: 24px; text-align: center; color: #888;">
      <div class="netflix-spinner-circle" style="width:36px; height:36px; margin:0 auto 10px;"></div>
      Загрузка списка серий и сезонов...
    </div>
  `;

  try {
    const payload = {
      title: item.title,
      magnet: item.magnet,
      topic_id: item.topic_id,
      link: item.magnet || (item.topic_id ? `https://rutracker.net/forum/viewtopic.php?t=${item.topic_id}` : null)
    };
    const res = await fetch('/api/stream/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Не удалось получить файлы торрента');
    const data = await res.json();
    state.modalTorrentItem = item;
    state.modalTorrentData = data;
    state.modalSeasons = data.seasons || {};
    state.modalVideoFiles = data.video_files || [];

    if (data.is_series || state.modalVideoFiles.length > 1) {
      modalEpisodesSection.style.display = 'block';
      const seasonKeys = Object.keys(state.modalSeasons);
      if (seasonKeys.length > 0) {
        seasonSelect.innerHTML = seasonKeys.map(s => `
          <option value="${s}">Сезон ${s}</option>
        `).join('');
        state.currentModalSeason = seasonKeys[0];
      } else {
        seasonSelect.innerHTML = '<option value="1">Серии</option>';
        state.currentModalSeason = '1';
      }
      renderModalEpisodesList(movie);
    } else {
      modalEpisodesSection.style.display = 'none';
    }
  } catch (err) {
    console.error('Modal episodes load error:', err);
    modalEpisodesSection.style.display = 'none';
  }
}

function switchModalSeason(s) {
  state.currentModalSeason = s;
  renderModalEpisodesList(state.activeMovie);
}

function renderModalEpisodesList(movie) {
  const eps = (state.modalSeasons && Object.keys(state.modalSeasons).length > 0)
    ? (state.modalSeasons[state.currentModalSeason] || Object.values(state.modalSeasons)[0] || [])
    : state.modalVideoFiles;

  if (modalEpisodeCount) {
    modalEpisodeCount.textContent = `${eps.length} серий`;
  }

  const thumbUrl = movie?.backdrop || movie?.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80';

  if (!eps || !eps.length) {
    modalEpisodesGrid.innerHTML = '<div style="color:#777; padding:16px;">Список серий пуст.</div>';
    return;
  }

  modalEpisodesGrid.innerHTML = eps.map(ep => `
    <div class="netflix-episode-card" onclick="playEpisodeFromModal(${ep.id})">
      <div class="ep-card-num">${ep.episode || ep.id}</div>
      <div class="ep-card-thumb-wrap">
        <img src="${thumbUrl}" alt="${escapeHtml(ep.title)}" class="ep-card-thumb-img">
        <div class="ep-card-play-overlay">
          <div class="ep-play-circle-icon">▶</div>
        </div>
      </div>
      <div class="ep-card-content">
        <div class="ep-card-header">
          <span class="ep-card-title">${escapeHtml(ep.title)}</span>
          <span class="ep-card-duration">${ep.duration_est || '45 мин'}</span>
        </div>
        <div class="ep-card-meta-row">
          <span class="ep-meta-pill">💾 ${ep.size_str || (ep.size_mb + ' МБ')}</span>
          <span class="ep-meta-pill" style="color:#46d369;">⚡ в обход VPN</span>
        </div>
        <p class="ep-card-synopsis">Нажмите для мгновенного просмотра серии со звуком.</p>
      </div>
    </div>
  `).join('');
}

function playEpisodeFromModal(fileId) {
  if (state.modalTorrentItem) {
    startNetflixStream(state.modalTorrentItem, fileId);
  }
}

function openTorrentReleaseModal(item) {
  state.activeMovie = item;
  const modalImg = item.backdrop || item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80';
  modalBackdrop.onerror = () => { modalBackdrop.src = generateCardSvg(item.display_title || item.title, item.display_year || item.date || '2024', item.quality || 'HD'); };
  modalBackdrop.src = modalImg;
  modalTitle.textContent = item.display_title || item.title;
  modalMatch.textContent = `▲ ${item.seeds} сидов`;
  modalYear.textContent = item.display_year || item.date || '2024';
  modalAge.textContent = '16+';
  modalQuality.textContent = item.quality || 'HD';
  modalAudio.textContent = item.audio || 'Русский звук';
  modalPlot.textContent = item.overview || `Раздача от источника ${item.source}. Размер: ${item.size}. Количество сидеров: ${item.seeds}.`;
  modalGenres.textContent = `Качество: ${item.quality} • Озвучка: ${item.audio}`;
  modalRating.textContent = item.rating ? `★ ${item.rating} / 10` : `Размер: ${item.size}`;

  modalEpisodesSection.style.display = 'none';
  movieDetailModal.style.display = 'flex';

  // Single release edition
  renderModalEditions([{
    curated_badge: '⚡ ВЫБРАННЫЙ РЕЛИЗ',
    curated_category: item.display_title || item.title,
    curated_desc: `Источник: ${item.source} • Сидов: ${item.seeds} • Размер: ${item.size}`,
    uploader_rating: '9.8',
    quality: item.quality,
    audio: item.audio,
    size: item.size,
    seeds: item.seeds,
    source: item.source,
    magnet: item.magnet,
    topic_id: item.topic_id
  }], [item]);

  const isSeries = item.is_series || item.title.toLowerCase().includes('сезон') || item.title.toLowerCase().includes('сери') || item.title.toLowerCase().includes('s0');
  if (isSeries) {
    loadEpisodesForModal(item, item);
  }
}

function renderModalEditions(verifiedList, allList) {
  const list = verifiedList.length ? verifiedList : (allList || []).slice(0, 4);

  if (!list.length) {
    modalEditionsList.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">Раздачи с активными сидами не найдены.<br><small>Попробуйте уточнить название или проверьте статус сети.</small></div>';
    return;
  }

  function getSeedPill(seeds) {
    const s = parseInt(seeds) || 0;
    if (s >= 50) {
      return `<span class="ed-pill" style="color:#46d369; background:rgba(70,211,105,0.18); font-weight:800; border:1px solid rgba(70,211,105,0.3);">🔥 ${s} сидов (Моментальный старт)</span>`;
    } else if (s >= 15) {
      return `<span class="ed-pill" style="color:#46d369; background:rgba(70,211,105,0.12); font-weight:700;">🟢 ${s} сидов (Отличная скорость)</span>`;
    } else if (s >= 5) {
      return `<span class="ed-pill" style="color:#e5a00d; background:rgba(229,160,13,0.12); font-weight:700;">🟡 ${s} сидов (Стабильный стрим)</span>`;
    } else {
      return `<span class="ed-pill" style="color:#ffa726; background:rgba(255,167,38,0.1);">🟠 ${s} сидов</span>`;
    }
  }

  let html = list.map((item, idx) => {
    let tagClass = 'tag-1080p-blue';
    const badge = item.curated_badge || '⭐ ПРОВЕРЕННЫЙ РЕЛИЗ';
    if (badge.includes('4K')) tagClass = 'tag-4k-gold';
    if (badge.includes('БЫСТРЫЙ')) tagClass = 'tag-fast-green';
    if (badge.includes('ОЗВУЧКА')) tagClass = 'tag-audio-purple';

    return `
      <div class="edition-item-card">
        <div class="edition-left-info">
          <span class="edition-badge-tag ${tagClass}">${badge}</span>
          <div class="edition-title">${escapeHtml(item.curated_category || item.title)}</div>
          <div class="edition-details-text">${escapeHtml(item.curated_desc || item.title)}</div>
          <div class="edition-tags-row">
            ${getSeedPill(item.seeds)}
            <span class="ed-pill">${item.quality || 'HD'}</span>
            <span class="ed-pill">${escapeHtml(item.audio || 'Дубляж')}</span>
            <span class="ed-pill">💾 ${item.size}</span>
          </div>
        </div>

        <div class="edition-actions">
          <button class="n-edition-play-btn" onclick="startNetflixStream(${JSON.stringify(item).replace(/"/g, '&quot;')})">
            <span>▶ Смотреть</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // If there are more releases, add expandable button
  if (allList && allList.length > list.length) {
    const extraCount = allList.length - list.length;
    html += `
      <div id="moreEditionsWrap" style="text-align:center; padding: 12px 0;">
        <button class="n-secondary-btn" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#ddd; padding:8px 20px; border-radius:4px; cursor:pointer;" onclick="showAllTorrentReleases(${JSON.stringify(allList).replace(/"/g, '&quot;')})">
          Показать все раздачи по сидам (+${extraCount})
        </button>
      </div>
    `;
  }

  modalEditionsList.innerHTML = html;
}

function showAllTorrentReleases(allList) {
  const moreWrap = document.getElementById('moreEditionsWrap');
  if (moreWrap) moreWrap.remove();

  function getSeedPill(seeds) {
    const s = parseInt(seeds) || 0;
    if (s >= 50) return `<span class="ed-pill" style="color:#46d369; background:rgba(70,211,105,0.18); font-weight:800;">🔥 ${s} сидов</span>`;
    if (s >= 15) return `<span class="ed-pill" style="color:#46d369; background:rgba(70,211,105,0.12); font-weight:700;">🟢 ${s} сидов</span>`;
    return `<span class="ed-pill" style="color:#e5a00d; background:rgba(229,160,13,0.12); font-weight:700;">🟡 ${s} сидов</span>`;
  }

  const extraHtml = allList.map(item => `
    <div class="edition-item-card" style="border-left: 2px solid #444;">
      <div class="edition-left-info">
        <div class="edition-title" style="font-size:0.95rem;">${escapeHtml(item.title)}</div>
        <div class="edition-tags-row">
          ${getSeedPill(item.seeds)}
          <span class="ed-pill">${item.source}</span>
          <span class="ed-pill">${item.quality || 'HD'}</span>
          <span class="ed-pill">${escapeHtml(item.audio || 'Звук')}</span>
          <span class="ed-pill">💾 ${item.size}</span>
        </div>
      </div>
      <div class="edition-actions">
        <button class="n-edition-play-btn" onclick="startNetflixStream(${JSON.stringify(item).replace(/"/g, '&quot;')})">
          <span>▶ Смотреть</span>
        </button>
      </div>
    </div>
  `).join('');

  modalEditionsList.insertAdjacentHTML('beforeend', extraHtml);
}

function playSelectedMovie() {
  const firstPlayBtn = modalEditionsList.querySelector('.n-edition-play-btn');
  if (firstPlayBtn) {
    firstPlayBtn.click();
  }
}

function closeDetailModal() {
  movieDetailModal.style.display = 'none';
}

function closeModalOnBackdrop(e) {
  if (e.target.classList.contains('netflix-modal-backdrop')) {
    e.target.style.display = 'none';
  }
}

// --- NETFLIX FULLSCREEN VIDEO PLAYER (1 В 1) ---
// --- NETFLIX FULLSCREEN VIDEO PLAYER (1 В 1) ---
function getStreamUrlForFile(hash, fileId) {
  if (state.audioMode === 'direct') {
    const file = state.videoFiles.find(f => f.id === fileId);
    const fname = file ? (file.filename || file.name) : 'video.mp4';
    return `http://127.0.0.1:8090/stream/${encodeURIComponent(fname)}?link=${hash}&index=${fileId}&play`;
  } else {
    // Guaranteed sound in Google Chrome/Safari with on-the-fly AAC audio transmuxing
    const audioIdx = state.activeAudioTrack || 0;
    const ssParam = (state.currentSeekOffset && state.currentSeekOffset > 0) ? `&ss=${state.currentSeekOffset}` : '';
    return `/api/stream/browser?link=${hash}&index=${fileId}&audio=${audioIdx}${ssParam}`;
  }
}

async function startNetflixStream(item, episodeFileId = null) {
  closeDetailModal();
  cancelNextEpisodeCountdown();
  netflixPlayerView.style.display = 'flex';
  playerTitle.textContent = item.curated_category || item.title;
  playerSubtitle.textContent = `${item.quality || 'HD'} • ${item.audio || 'Дубляж'} • В обход VPN`;
  playerSpinner.style.display = 'flex';
  spinnerText.textContent = 'Подключение к раздаче в обход VPN...';

  try {
    const payload = {
      title: item.title,
      magnet: item.magnet,
      topic_id: item.topic_id,
      link: item.magnet || (item.topic_id ? `https://rutracker.net/forum/viewtopic.php?t=${item.topic_id}` : null)
    };

    const res = await fetch('/api/stream/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errMsg = 'Не удалось подготовить поток';
      try {
        const err = await res.json();
        errMsg = err.detail || err.error || errMsg;
      } catch (_) {
        const txt = await res.text();
        if (txt) errMsg = txt;
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    state.activeTorrentHash = data.hash;
    state.videoFiles = data.video_files || [];
    state.seasons = data.seasons || {};
    state.activeFileIndex = (episodeFileId !== null) ? episodeFileId : (data.default_index || 0);

    const activeFile = state.videoFiles.find(f => f.id === state.activeFileIndex) || state.videoFiles[0];
    if (activeFile && (activeFile.title || activeFile.name)) {
      playerTitle.textContent = `${item.curated_category || item.title} • ${activeFile.title || activeFile.name}`;
      if (activeFile.season) {
        state.currentDrawerSeason = String(activeFile.season);
      }
    }

    // Series episodes drawer setup
    if (state.videoFiles.length > 1) {
      playerNextEpBtn.style.display = 'flex';
      playerEpisodesMenuBtn.style.display = 'flex';
      populateDrawerSeasons();
      renderPlayerEpisodesList();
    } else {
      playerNextEpBtn.style.display = 'none';
      playerEpisodesMenuBtn.style.display = 'none';
    }

    // Set duration from episode/torrent/catalog metadata
    state.currentSeekOffset = 0;
    state.mediaDuration = (activeFile && activeFile.duration_seconds) || data.duration || item.duration_seconds || state.activeMovie?.duration_seconds || 5400;
    playerDuration.textContent = formatTime(state.mediaDuration);
    playerCurrentTime.textContent = '0:00';
    playerProgressPlayed.style.width = '0%';
    playerScrubberHandle.style.left = '0%';

    // Set video src with audio guaranteed
    state.currentStreamUrl = getStreamUrlForFile(state.activeTorrentHash, state.activeFileIndex);
    netflixVideo.src = state.currentStreamUrl;
    netflixVideo.muted = false;
    netflixVideo.volume = parseFloat(playerVolumeSlider ? playerVolumeSlider.value : 1.0);
    updateVolumeIcons();
    netflixVideo.load();
    netflixVideo.play().catch(e => console.log('Autoplay deferred:', e));

    startStatsPolling();
    loadAudioTracks(state.activeTorrentHash, state.activeFileIndex);

  } catch (err) {
    alert('Ошибка запуска: ' + err.message);
    exitNetflixPlayer();
  }
}

function populateDrawerSeasons() {
  const seasonKeys = Object.keys(state.seasons);
  if (seasonKeys.length > 0) {
    drawerSeasonSelect.style.display = 'block';
    drawerSeasonSelect.innerHTML = seasonKeys.map(s => `
      <option value="${s}" ${s === state.currentDrawerSeason ? 'selected' : ''}>Сезон ${s}</option>
    `).join('');
  } else {
    drawerSeasonSelect.style.display = 'none';
  }
}

function switchDrawerSeason(s) {
  state.currentDrawerSeason = s;
  renderPlayerEpisodesList();
}

function renderPlayerEpisodesList() {
  const seasonEps = (state.seasons && Object.keys(state.seasons).length > 0)
    ? (state.seasons[state.currentDrawerSeason] || Object.values(state.seasons)[0] || [])
    : state.videoFiles;

  playerEpisodesList.innerHTML = seasonEps.map(file => {
    const isPlaying = file.id === state.activeFileIndex;
    return `
      <div class="drawer-item ${isPlaying ? 'active' : ''}" onclick="switchPlayerEpisode(${file.id})">
        <div class="drawer-item-title">${escapeHtml(file.title || file.name)}</div>
        <div class="drawer-item-meta">
          ${isPlaying ? '<span style="color:#46d369; margin-right:4px;">●</span>' : ''}
          ${file.duration_est ? file.duration_est + ' • ' : ''}${file.size_str || (file.size_mb + ' МБ')}
        </div>
      </div>
    `;
  }).join('');
}

function togglePlayerEpisodesMenu() {
  const isHidden = playerEpisodesDrawer.style.display === 'none';
  playerEpisodesDrawer.style.display = isHidden ? 'flex' : 'none';
  if (playerAudioMenu) playerAudioMenu.style.display = 'none';
  if (playerSpeedMenu) playerSpeedMenu.style.display = 'none';
}

function switchPlayerEpisode(fileId) {
  state.activeFileIndex = fileId;
  const file = state.videoFiles.find(f => f.id === fileId);
  if (!file) return;

  if (file.season) {
    state.currentDrawerSeason = String(file.season);
    if (drawerSeasonSelect) drawerSeasonSelect.value = String(file.season);
  }

  renderPlayerEpisodesList();
  playerSpinner.style.display = 'flex';
  spinnerText.textContent = `Загрузка: ${file.title || file.name}...`;

  state.currentSeekOffset = 0;
  state.mediaDuration = file.duration_seconds || state.mediaDuration || 2700;
  playerDuration.textContent = formatTime(state.mediaDuration);
  playerCurrentTime.textContent = '0:00';
  playerProgressPlayed.style.width = '0%';
  playerScrubberHandle.style.left = '0%';

  state.currentStreamUrl = getStreamUrlForFile(state.activeTorrentHash, fileId);
  netflixVideo.src = state.currentStreamUrl;
  netflixVideo.load();
  netflixVideo.play().catch(e => console.log('Autoplay deferred:', e));

  const movieTitle = state.activeMovie?.curated_category || state.activeMovie?.title || '';
  playerTitle.textContent = `${movieTitle} • ${file.title || file.name}`;
  playerEpisodesDrawer.style.display = 'none';

  cancelNextEpisodeCountdown();
  loadAudioTracks(state.activeTorrentHash, fileId);
}

function playNextEpisode() {
  const currentIdx = state.videoFiles.findIndex(f => f.id === state.activeFileIndex);
  if (currentIdx >= 0 && currentIdx < state.videoFiles.length - 1) {
    switchPlayerEpisode(state.videoFiles[currentIdx + 1].id);
  }
}

function startNextEpisodeCountdown(nextFile) {
  if (state.nextEpCountdownTimer) clearInterval(state.nextEpCountdownTimer);
  state.pendingNextFile = nextFile;
  nextEpTitle.textContent = nextFile.title || nextFile.name;
  nextEpToast.style.display = 'flex';
  let remaining = 5;
  nextEpTimer.textContent = remaining;

  state.nextEpCountdownTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(state.nextEpCountdownTimer);
      state.nextEpCountdownTimer = null;
      nextEpToast.style.display = 'none';
      switchPlayerEpisode(nextFile.id);
    } else {
      nextEpTimer.textContent = remaining;
    }
  }, 1000);
}

function playNextEpisodeImmediately() {
  if (state.nextEpCountdownTimer) {
    clearInterval(state.nextEpCountdownTimer);
    state.nextEpCountdownTimer = null;
  }
  nextEpToast.style.display = 'none';
  if (state.pendingNextFile) {
    switchPlayerEpisode(state.pendingNextFile.id);
  } else {
    playNextEpisode();
  }
}

function cancelNextEpisodeCountdown() {
  if (state.nextEpCountdownTimer) {
    clearInterval(state.nextEpCountdownTimer);
    state.nextEpCountdownTimer = null;
  }
  nextEpToast.style.display = 'none';
  state.pendingNextFile = null;
}

// Audio Tracks & Mode Handling
function toggleAudioDropdown() {
  const isHidden = playerAudioMenu.style.display === 'none';
  playerAudioMenu.style.display = isHidden ? 'block' : 'none';
  if (playerSpeedMenu) playerSpeedMenu.style.display = 'none';
  if (playerEpisodesDrawer) playerEpisodesDrawer.style.display = 'none';
}

function setAudioMode(mode) {
  state.audioMode = mode;
  if (audioModeAac) audioModeAac.classList.toggle('active', mode === 'aac');
  if (audioModeDirect) audioModeDirect.classList.toggle('active', mode === 'direct');
  playerSpinner.style.display = 'flex';
  spinnerText.textContent = mode === 'aac' ? 'Включение звука браузера (AAC)...' : 'Включение прямого потока...';

  const cur = Math.floor(getEffectiveCurrentTime());
  if (mode === 'aac') {
    state.currentSeekOffset = cur;
    state.currentStreamUrl = getStreamUrlForFile(state.activeTorrentHash, state.activeFileIndex);
    netflixVideo.src = state.currentStreamUrl;
    netflixVideo.load();
    netflixVideo.play().catch(() => {});
  } else {
    state.currentSeekOffset = 0;
    state.currentStreamUrl = getStreamUrlForFile(state.activeTorrentHash, state.activeFileIndex);
    netflixVideo.src = state.currentStreamUrl;
    netflixVideo.load();
    netflixVideo.currentTime = cur;
    netflixVideo.play().catch(() => {});
  }
  playerAudioMenu.style.display = 'none';
}

function switchAudioTrack(trackIdx) {
  state.activeAudioTrack = trackIdx;
  renderAudioTracksMenu();
  playerSpinner.style.display = 'flex';
  spinnerText.textContent = 'Переключение аудиодорожки...';

  const cur = Math.floor(getEffectiveCurrentTime());
  state.currentSeekOffset = cur;
  state.currentStreamUrl = getStreamUrlForFile(state.activeTorrentHash, state.activeFileIndex);
  netflixVideo.src = state.currentStreamUrl;
  netflixVideo.load();
  netflixVideo.play().catch(() => {});
  playerAudioMenu.style.display = 'none';
}

async function loadAudioTracks(hash, fileId) {
  try {
    const res = await fetch(`/api/stream/tracks?link=${hash}&index=${fileId}`);
    if (!res.ok) return;
    const data = await res.json();
    state.audioTracks = data.audio_tracks || [];
    renderAudioTracksMenu();
    if (data.duration && data.duration > 30) {
      state.mediaDuration = Math.round(data.duration);
      playerDuration.textContent = formatTime(state.mediaDuration);
      updateProgress();
    }
  } catch (e) {
    console.log('Tracks probe notice:', e);
  }
}

function renderAudioTracksMenu() {
  if (!state.audioTracks.length) {
    audioTracksHeader.style.display = 'none';
    audioTracksList.innerHTML = '';
    return;
  }
  audioTracksHeader.style.display = 'block';
  audioTracksList.innerHTML = state.audioTracks.map((tr, idx) => `
    <div class="n-drop-item ${idx === state.activeAudioTrack ? 'active' : ''}" onclick="switchAudioTrack(${idx})">
      ${tr.lang ? `[${tr.lang.toUpperCase()}] ` : ''}${escapeHtml(tr.title || 'Дорожка ' + (idx + 1))}
      ${tr.codec ? `<small style="opacity:0.7;"> (${tr.codec.toUpperCase()})</small>` : ''}
    </div>
  `).join('');
}

async function exitNetflixPlayer() {
  cancelNextEpisodeCountdown();
  netflixVideo.pause();
  netflixVideo.removeAttribute('src');
  netflixVideo.load();
  if (playerEpisodesDrawer) playerEpisodesDrawer.style.display = 'none';
  if (playerAudioMenu) playerAudioMenu.style.display = 'none';
  if (playerSpeedMenu) playerSpeedMenu.style.display = 'none';

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  stopStatsPolling();

  // Drop torrent immediately in TorrServer to save user bandwidth
  if (state.activeTorrentHash) {
    fetch('/api/stream/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torrent_hash: state.activeTorrentHash })
    }).catch(() => {});
    state.activeTorrentHash = null;
  }

  netflixPlayerView.style.display = 'none';
}

// Player Events & Controls
function setupPlayerEventListeners() {
  netflixVideo.addEventListener('timeupdate', updateProgress);
  netflixVideo.addEventListener('waiting', () => {
    playerSpinner.style.display = 'flex';
  });
  netflixVideo.addEventListener('playing', () => {
    playerSpinner.style.display = 'none';
    updatePlayPauseIcons();
  });
  netflixVideo.addEventListener('pause', updatePlayPauseIcons);
  netflixVideo.addEventListener('progress', updateBufferedRange);
  netflixVideo.addEventListener('error', (e) => {
    console.warn('Video playback notice:', netflixVideo.error);
    playerSpinner.style.display = 'none';
    const banner = document.getElementById('playerHealthText');
    if (banner) {
      banner.innerHTML = `<span style="color:#ff6b6b; font-weight:700;">⚠️ Браузер не может декодировать звук/контейнер этой раздачи. Выберите версию «Быстрый старт» (BDRip-AVC/MP4) или нажмите «В плеере Mac».</span>`;
    }
  });

  // Next episode when current ends
  netflixVideo.addEventListener('ended', () => {
    if (state.videoFiles && state.videoFiles.length > 1) {
      const currentIdx = state.videoFiles.findIndex(f => f.id === state.activeFileIndex);
      if (currentIdx >= 0 && currentIdx < state.videoFiles.length - 1) {
        startNextEpisodeCountdown(state.videoFiles[currentIdx + 1]);
      }
    }
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#playerAudioBtn') && !e.target.closest('#playerAudioMenu')) {
      if (playerAudioMenu) playerAudioMenu.style.display = 'none';
    }
    if (!e.target.closest('#playerSpeedBtn') && !e.target.closest('#playerSpeedMenu')) {
      if (playerSpeedMenu) playerSpeedMenu.style.display = 'none';
    }
  });

  // Auto-hide controls after 2.5s
  netflixViewport.addEventListener('mousemove', resetControlsTimeout);
  netflixViewport.addEventListener('mouseleave', () => {
    if (!netflixVideo.paused) {
      netflixViewport.classList.add('controls-hidden');
    }
  });

  // Tap video to play/pause
  netflixVideo.addEventListener('click', () => {
    togglePlay();
    triggerRipple(netflixVideo.paused ? '⏸' : '▶');
  });
}

function resetControlsTimeout() {
  netflixViewport.classList.remove('controls-hidden');
  clearTimeout(state.controlsTimeout);
  if (!netflixVideo.paused) {
    state.controlsTimeout = setTimeout(() => {
      netflixViewport.classList.add('controls-hidden');
    }, 2500);
  }
}

function togglePlay() {
  if (netflixVideo.paused) {
    netflixVideo.play();
  } else {
    netflixVideo.pause();
  }
  updatePlayPauseIcons();
}

function updatePlayPauseIcons() {
  if (netflixVideo.paused) {
    nPlayIcon.style.display = 'block';
    nPauseIcon.style.display = 'none';
  } else {
    nPlayIcon.style.display = 'none';
    nPauseIcon.style.display = 'block';
  }
}

function triggerRipple(symbol) {
  document.getElementById('playerRippleIcon').textContent = symbol;
  const ripple = document.getElementById('playerCenterRipple');
  ripple.classList.remove('animate');
  void ripple.offsetWidth;
  ripple.classList.add('animate');
}

function seekToTime(targetSeconds) {
  const dur = getEffectiveDuration();
  const target = Math.max(0, Math.min(Math.max(0, dur - 2), Math.floor(targetSeconds)));

  if (state.audioMode === 'aac') {
    state.currentSeekOffset = target;
    playerSpinner.style.display = 'flex';
    spinnerText.textContent = `Перемотка на ${formatTime(target)}...`;

    // Immediate UI feedback on scrubber and timer
    const percent = dur > 0 ? (target / dur) * 100 : 0;
    playerProgressPlayed.style.width = `${percent}%`;
    playerScrubberHandle.style.left = `${percent}%`;
    playerCurrentTime.textContent = formatTime(target);

    state.currentStreamUrl = `/api/stream/browser?link=${state.activeTorrentHash}&index=${state.activeFileIndex}&audio=${state.activeAudioTrack}&ss=${target}`;
    netflixVideo.src = state.currentStreamUrl;
    netflixVideo.load();
    netflixVideo.play().catch(e => console.log('Seek play notice:', e));
  } else {
    netflixVideo.currentTime = target;
  }
}

function seekRelative(seconds) {
  const cur = getEffectiveCurrentTime();
  const dur = getEffectiveDuration();
  const target = Math.max(0, Math.min(dur, cur + seconds));
  seekToTime(target);
  triggerRipple(seconds > 0 ? '+10' : '-10');
}

function updateProgress() {
  const cur = getEffectiveCurrentTime();
  const dur = getEffectiveDuration();
  playerCurrentTime.textContent = formatTime(cur);
  playerDuration.textContent = formatTime(dur);

  if (dur > 0) {
    const percent = Math.min(100, Math.max(0, (cur / dur) * 100));
    playerProgressPlayed.style.width = `${percent}%`;
    playerScrubberHandle.style.left = `${percent}%`;
  }
}

function updateBufferedRange() {
  const dur = getEffectiveDuration();
  if (!dur || !netflixVideo.buffered.length) return;
  try {
    const end = (state.currentSeekOffset || 0) + netflixVideo.buffered.end(netflixVideo.buffered.length - 1);
    const percent = Math.min(100, Math.max(0, (end / dur) * 100));
    playerProgressBuffered.style.width = `${percent}%`;
  } catch (e) {}
}

function handleProgressHover(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const dur = getEffectiveDuration();
  const previewTime = pos * dur;

  playerHoverTime.style.display = 'block';
  playerHoverTime.style.left = `${pos * 100}%`;
  playerHoverTime.textContent = formatTime(previewTime);
}

function hideProgressHover() {
  playerHoverTime.style.display = 'none';
}

function handleProgressClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const dur = getEffectiveDuration();
  if (dur > 0) {
    const target = pos * dur;
    seekToTime(target);
  }
}

function changeVolume(val) {
  netflixVideo.volume = parseFloat(val);
  netflixVideo.muted = false;
  updateVolumeIcons();
}

function toggleMute() {
  netflixVideo.muted = !netflixVideo.muted;
  updateVolumeIcons();
}

function updateVolumeIcons() {
  if (netflixVideo.muted || netflixVideo.volume === 0) {
    nVolHigh.style.display = 'none';
    nVolMute.style.display = 'block';
  } else {
    nVolHigh.style.display = 'block';
    nVolMute.style.display = 'none';
  }
}

function toggleSpeedDropdown() {
  const isHidden = playerSpeedMenu.style.display === 'none';
  playerSpeedMenu.style.display = isHidden ? 'block' : 'none';
}

function setSpeed(s) {
  netflixVideo.playbackRate = s;
  playerSpeedText.textContent = `${s}x`;
  document.querySelectorAll('.n-drop-item').forEach(i => {
    i.classList.toggle('active', i.textContent.startsWith(`${s}x`));
  });
  playerSpeedMenu.style.display = 'none';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    netflixViewport.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

async function openInExternalPlayer(player) {
  if (!state.currentStreamUrl) return;
  try {
    await fetch('/api/open-external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stream_url: state.currentStreamUrl,
        player: player
      })
    });
  } catch (err) {
    alert('Не удалось открыть плеер: ' + err.message);
  }
}

function startStatsPolling() {
  stopStatsPolling();
  state.statsInterval = setInterval(async () => {
    if (!state.activeTorrentHash) return;
    try {
      const res = await fetch(`/api/stream/stats?hash=${state.activeTorrentHash}`);
      const stats = await res.json();
      if (stats.active) {
        playerHealthText.textContent = `⚡ В обход VPN (en0) • ${stats.download_speed_mb} МБ/с • ${stats.active_peers} пиров • Буфер: ${stats.buffer_percent}%`;
        if (stats.buffer_percent > 0 && stats.buffer_percent < 100) {
          spinnerText.textContent = `Буферизация: ${stats.buffer_percent}% (${stats.download_speed_mb} МБ/с)...`;
        }
        if (stats.is_ready) {
          playerSpinner.style.display = 'none';
        }
      }
    } catch (e) {}
  }, 1500);
}

function stopStatsPolling() {
  if (state.statsInterval) {
    clearInterval(state.statsInterval);
    state.statsInterval = null;
  }
}

// Hotkeys & TV Remote Navigation
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }

    // Smart TV Mode: Remote & Number keys handling
    if (state.tvMode) {
      if (netflixPlayerView.style.display !== 'flex' && movieDetailModal.style.display !== 'flex') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handleTvNumberKey(e.key);
          return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          handleTvArrowKey(e.key);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTvEnter();
          return;
        }
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          handleTvBack();
          return;
        }
        if (e.key.toLowerCase() === 'n' || e.key === 'PageDown') {
          e.preventDefault();
          tvPageNext();
          return;
        }
        if (e.key.toLowerCase() === 'p' || e.key === 'PageUp') {
          e.preventDefault();
          tvPagePrev();
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          tvOpenSearchPrompt();
          return;
        }
      }
    }

    if (netflixPlayerView.style.display === 'flex') {
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          triggerRipple(netflixVideo.paused ? '⏸' : '▶');
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowup':
          e.preventDefault();
          netflixVideo.volume = Math.min(1, netflixVideo.volume + 0.05);
          playerVolumeSlider.value = netflixVideo.volume;
          updateVolumeIcons();
          break;
        case 'arrowdown':
          e.preventDefault();
          netflixVideo.volume = Math.max(0, netflixVideo.volume - 0.05);
          playerVolumeSlider.value = netflixVideo.volume;
          updateVolumeIcons();
          break;
        case 'escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            exitNetflixPlayer();
          }
          break;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const frac = parseInt(e.key) / 10;
        const dur = getEffectiveDuration();
        seekToTime(dur * frac);
      }
    } else if (movieDetailModal.style.display === 'flex') {
      if (e.key === 'Escape') {
        closeDetailModal();
      } else if (e.key === '1' || e.key === 'Enter') {
        playSelectedMovie();
      } else if (e.key === '2' && state.modalTorrentData?.is_series) {
        const firstEp = document.querySelector('.netflix-episode-card:first-child');
        if (firstEp) firstEp.click();
      } else if (e.key === '3') {
        saveActiveMovieToDisk();
      }
    }
  });
}

// --- SETTINGS & RUTRACKER MODAL ---
async function checkRuTrackerStatus() {
  try {
    const res = await fetch('/api/settings/rutracker/status');
    const data = await res.json();
    state.rutrackerLoggedIn = data.authenticated;

    if (data.authenticated) {
      rtDot.className = 'status-dot dot-green';
      rtText.textContent = `RuTracker: ${data.username || 'Подключен'}`;
    } else {
      rtDot.className = 'status-dot dot-gray';
      rtText.textContent = 'RuTracker (Войти)';
    }
  } catch (e) {
    rtDot.className = 'status-dot dot-gray';
  }
}

function openRuTrackerModal() {
  document.getElementById('rutrackerModal').style.display = 'flex';
}
function closeRuTrackerModal() {
  document.getElementById('rutrackerModal').style.display = 'none';
}

function switchRuTrackerTab(tab) {
  document.getElementById('paneLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('paneCookie').style.display = tab === 'cookie' ? 'block' : 'none';
  document.getElementById('tabLoginBtn').classList.toggle('active', tab === 'login');
  document.getElementById('tabCookieBtn').classList.toggle('active', tab === 'cookie');
}

async function submitRuTrackerLogin() {
  const u = document.getElementById('rtUsernameInput').value.trim();
  const p = document.getElementById('rtPasswordInput').value.trim();
  const msg = document.getElementById('rtStatusMsg');
  if (!u || !p) {
    msg.innerHTML = '<span style="color:#e74c3c;">Введите логин и пароль</span>';
    return;
  }
  msg.innerHTML = '<span>Проверка авторизации...</span>';
  try {
    const res = await fetch('/api/settings/rutracker/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();
    if (data.success) {
      msg.innerHTML = '<span style="color:#2ecc71;">✔ Успешно подключено к RuTracker!</span>';
      checkRuTrackerStatus();
      setTimeout(closeRuTrackerModal, 1500);
    } else {
      msg.innerHTML = `<span style="color:#e74c3c;">Ошибка: ${data.error}</span>`;
    }
  } catch (err) {
    msg.innerHTML = `<span style="color:#e74c3c;">Ошибка: ${err.message}</span>`;
  }
}

async function submitRuTrackerCookie() {
  const c = document.getElementById('rtCookieInput').value.trim();
  const msg = document.getElementById('rtStatusMsg');
  if (!c) {
    msg.innerHTML = '<span style="color:#e74c3c;">Вставьте строку cookie</span>';
    return;
  }
  try {
    const res = await fetch('/api/settings/rutracker/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: c })
    });
    const data = await res.json();
    if (data.success) {
      msg.innerHTML = '<span style="color:#2ecc71;">✔ Cookie успешно сохранены!</span>';
      checkRuTrackerStatus();
      setTimeout(closeRuTrackerModal, 1500);
    } else {
      msg.innerHTML = `<span style="color:#e74c3c;">Ошибка: ${data.error}</span>`;
    }
  } catch (err) {
    msg.innerHTML = `<span style="color:#e74c3c;">Ошибка: ${err.message}</span>`;
  }
}

async function openSettingsModal() {
  document.getElementById('settingsModal').style.display = 'flex';
  const uiSelect = document.getElementById('uiModeSelect');
  if (uiSelect) {
    uiSelect.value = state.tvMode ? 'tv' : 'desktop';
  }
  try {
    const res = await fetch('/api/network/status');
    const net = await res.json();
    document.getElementById('netRtRoute').textContent = net.rutracker_routing;
    document.getElementById('netTorrentRoute').textContent = net.stream_routing;
  } catch (e) {}
}

function handleUiModeChange(val) {
  setTvMode(val === 'tv');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

async function saveSpeedLimits() {
  const down = parseInt(document.getElementById('downloadLimitSelect').value);
  const proxy = document.getElementById('customProxyInput').value.trim();
  try {
    await fetch('/api/settings/speed-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_kb: down, upload_kb: 50 })
    });
    await fetch('/api/settings/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxy_url: proxy || null })
    });
    closeSettingsModal();
  } catch (e) {
    alert('Ошибка сохранения');
  }
}

// Utils
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// --- SMART TV MODE ENGINE (REMOTE / ARROWS / NUMBERS 0-9) ---
function toggleTvMode() {
  setTvMode(!state.tvMode);
}

function setTvMode(enable) {
  state.tvMode = enable;
  localStorage.setItem('kinoflix_tv_mode', enable ? 'true' : 'false');
  document.body.classList.toggle('tv-mode', enable);

  if (tvModeBtnText) {
    tvModeBtnText.textContent = enable ? 'ТВ Активен' : 'Для ТВ';
  }

  const uiSelect = document.getElementById('uiModeSelect');
  if (uiSelect) {
    uiSelect.value = enable ? 'tv' : 'desktop';
  }

  if (enable) {
    homeView.style.display = 'none';
    searchResultsView.style.display = 'none';
    if (downloadsView) downloadsView.style.display = 'none';
    if (tvView) tvView.style.display = 'block';
    refreshTvItems();
  } else {
    if (tvView) tvView.style.display = 'none';
    goHome();
  }
}

function switchTvCategory(cat) {
  state.tvCategory = cat;
  state.tvPageIndex = 0;
  state.tvFocusIndex = 0;

  document.querySelectorAll('.tv-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tv-cat') === cat);
  });

  refreshTvItems();
}

function refreshTvItems() {
  if (!state.catalog) return;
  const cats = state.catalog.categories || [];

  let pool = [];
  if (state.tvCategory === 'all') {
    pool = cats.flatMap(c => c.items || []);
  } else if (state.tvCategory === 'new' || state.tvCategory === 'new_releases') {
    const newCat = cats.find(c => c.id === 'new_releases');
    pool = newCat ? newCat.items : (cats[0]?.items || []);
  } else if (state.tvCategory === 'series') {
    pool = cats.flatMap(c => c.items || []).filter(item => item.is_series);
  } else if (state.tvCategory === 'downloads') {
    loadTvDownloads();
    return;
  } else {
    // Dynamic match for all classic genres
    const matched = cats.find(c => c.id === state.tvCategory);
    if (matched) {
      pool = matched.items || [];
    } else {
      pool = cats.flatMap(c => c.items || []);
    }
  }

  // Deduplicate items by title
  const seenTitles = new Set();
  const deduped = [];
  for (const it of pool) {
    if (it && it.title && !seenTitles.has(it.title)) {
      seenTitles.add(it.title);
      deduped.push(it);
    }
  }

  state.tvItems = deduped;
  renderTvCards();
}

async function loadTvDownloads() {
  try {
    const res = await fetch('/api/downloads/list');
    const data = await res.json();
    state.tvItems = (data.items || []).map(d => ({
      id: d.filename,
      title: d.title,
      is_download: true,
      size: d.size_str,
      filename: d.filename,
      stream_url: d.stream_url,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80',
      quality: 'HD',
      rating: '10',
      match: '100%'
    }));
    renderTvCards();
  } catch (e) {
    state.tvItems = [];
    renderTvCards();
  }
}

function renderTvCards() {
  const total = state.tvItems.length;
  const maxPages = Math.max(1, Math.ceil(total / 10));
  if (state.tvPageIndex >= maxPages) state.tvPageIndex = maxPages - 1;
  if (state.tvPageIndex < 0) state.tvPageIndex = 0;

  // At most 10 items for the current page (guaranteed!)
  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);

  if (tvPageInfo) {
    tvPageInfo.textContent = `Страница ${state.tvPageIndex + 1} из ${maxPages} (${total} вариантов)`;
  }

  if (pageItems.length === 0) {
    tvCardsGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #888; font-size: 1.2rem;">Элементы не найдены. Нажмите [S] для поиска.</div>';
    return;
  }

  if (state.tvFocusIndex >= pageItems.length) {
    state.tvFocusIndex = pageItems.length - 1;
  }
  if (state.tvFocusIndex < 0) state.tvFocusIndex = 0;

  tvCardsGrid.innerHTML = pageItems.map((item, idx) => {
    // Numbers: [1], [2], [3], [4], [5], [6], [7], [8], [9], [0]
    const badgeNum = (idx + 1) % 10;
    const isFocused = (idx === state.tvFocusIndex);
    return `
      <div class="tv-card ${isFocused ? 'tv-focused' : ''}" id="tvCard_${idx}" onclick="handleTvCardClick(${idx})">
        <div class="tv-card-thumb-wrap">
          <div class="tv-card-num-badge">[${badgeNum}]</div>
          <img src="${item.backdrop || item.poster}" alt="${escapeHtml(item.title)}" class="tv-card-img" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${item.year || ''}', '${item.quality || 'HD'}');">
        </div>
        <div class="tv-card-body">
          <div class="tv-card-title">${escapeHtml(item.title)}</div>
          <div class="tv-card-meta">
            <span class="tv-card-rating">★ ${item.rating || '8.8'}</span>
            <span>${item.year || '2024'}</span>
            <span class="quality-badge">${item.quality || 'HD'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateTvFocus();
}

function updateTvFocus() {
  document.querySelectorAll('.tv-card').forEach((c, idx) => {
    c.classList.toggle('tv-focused', idx === state.tvFocusIndex);
  });
  const focusedCard = document.getElementById(`tvCard_${state.tvFocusIndex}`);
  if (focusedCard) {
    focusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function handleTvCardClick(idx) {
  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);
  const item = pageItems[idx];
  if (!item) return;

  state.tvFocusIndex = idx;
  updateTvFocus();

  if (item.is_download) {
    playLocalDownload(item.filename, item.title);
  } else {
    openMovieDetails(item);
  }
}

function handleTvNumberKey(key) {
  let targetIdx = -1;
  if (key >= '1' && key <= '9') {
    targetIdx = parseInt(key) - 1;
  } else if (key === '0') {
    targetIdx = 9;
  }

  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);

  if (targetIdx >= 0 && targetIdx < pageItems.length) {
    handleTvCardClick(targetIdx);
  } else if (key === '0') {
    setTvMode(false);
  }
}

function handleTvArrowKey(key) {
  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);
  if (!pageItems.length) return;

  const cols = (window.innerWidth <= 1200) ? 2 : 5;

  if (key === 'ArrowRight') {
    state.tvFocusIndex = (state.tvFocusIndex + 1) % pageItems.length;
  } else if (key === 'ArrowLeft') {
    state.tvFocusIndex = (state.tvFocusIndex - 1 + pageItems.length) % pageItems.length;
  } else if (key === 'ArrowDown') {
    if (state.tvFocusIndex + cols < pageItems.length) {
      state.tvFocusIndex += cols;
    } else {
      tvPageNext();
      return;
    }
  } else if (key === 'ArrowUp') {
    if (state.tvFocusIndex - cols >= 0) {
      state.tvFocusIndex -= cols;
    } else {
      tvPagePrev();
      return;
    }
  }

  updateTvFocus();
}

function handleTvEnter() {
  handleTvCardClick(state.tvFocusIndex);
}

function handleTvBack() {
  if (netflixPlayerView.style.display === 'flex') {
    exitNetflixPlayer();
  } else if (movieDetailModal.style.display === 'flex') {
    closeDetailModal();
  } else if (state.tvPageIndex > 0) {
    tvPagePrev();
  } else if (state.tvCategory !== 'all') {
    switchTvCategory('all');
  } else {
    setTvMode(false);
  }
}

function tvPageNext() {
  const total = state.tvItems.length;
  const maxPages = Math.ceil(total / 10);
  if (state.tvPageIndex < maxPages - 1) {
    state.tvPageIndex++;
    state.tvFocusIndex = 0;
    renderTvCards();
  }
}

function tvPagePrev() {
  if (state.tvPageIndex > 0) {
    state.tvPageIndex--;
    state.tvFocusIndex = 0;
    renderTvCards();
  }
}

function tvOpenSearchPrompt() {
  const q = prompt('Введите название фильма или сериала для поиска:');
  if (q && q.trim()) {
    performSearch(q.trim());
    if (state.tvMode) {
      searchResultsView.style.display = 'block';
      if (tvView) tvView.style.display = 'none';
    }
  }
}
