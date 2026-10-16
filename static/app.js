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
  tvZone: 'cards', // 'header' | 'tabs' | 'cards' | 'bottom'
  tvFocusIndex: 0, // 0..9 index within cards grid
  tvTabIndex: 0,   // active category tab index
  tvBottomIndex: 1, // 0: prev, 1: next, 2: search
  viewMode: 'rows', // 'rows' or 'canvas' (полотно)
  currentCategory: 'all',
  canvasItems: [],
  canvasPage: 1,
  canvasLoading: false
};

// DOM Elements
const netflixHeader = document.getElementById('netflixHeader');
const searchBox = document.getElementById('searchBox');
const netflixSearchInput = document.getElementById('netflixSearchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const homeView = document.getElementById('homeView');
const rowsContainer = document.getElementById('rowsContainer');
const canvasContainer = document.getElementById('canvasContainer');
const btnViewRows = document.getElementById('btnViewRows');
const btnViewCanvas = document.getElementById('btnViewCanvas');
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
const tvExitBtn = document.getElementById('tvExitBtn');
const tvPrevBtn = document.getElementById('tvPrevBtn');
const tvNextBtn = document.getElementById('tvNextBtn');
const tvSearchBtn = document.getElementById('tvSearchBtn');

// Billboard DOM
const billboardImg = document.getElementById('billboardImg');
const billboardTitle = document.getElementById('billboardTitle');
const billboardRating = document.getElementById('billboardRating');
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
const modalRatingBadge = document.getElementById('modalRatingBadge');
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

// Header scroll effect and infinite canvas scrolling
function setupScrollHeader() {
  // Completely prevent mouse wheel and touch gesture scrolling in TV mode
  window.addEventListener('wheel', (e) => {
    if (state.tvMode) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (state.tvMode) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('scroll', () => {
    if (state.tvMode) {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      return;
    }

    if (window.scrollY > 40) {
      netflixHeader.classList.add('scrolled');
    } else {
      netflixHeader.classList.remove('scrolled');
    }

    // Infinite canvas scroll
    if (state.viewMode === 'canvas' && homeView && homeView.style.display !== 'none') {
      if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 650)) {
        loadMoreCanvasItems();
      }
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
  if (billboardRating) billboardRating.textContent = '★ ' + (item.rating || '8.8');
  billboardYear.textContent = item.year || '2024';
  billboardAge.textContent = item.age || '16+';
  billboardDuration.textContent = item.duration || '2 ч 15 мин';
  billboardQuality.textContent = item.quality || 'Ultra HD 4K';
  billboardAudio.textContent = item.audio ? '5.1' : 'Стерео';
  billboardPlot.textContent = item.plot;
}

function renderCardHtml(item) {
  const cardImg = item.backdrop || item.poster || generateCardSvg(item.title, item.year, item.quality);
  return `
    <div class="netflix-card" onclick="openMovieDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
      <img src="${cardImg}" alt="${escapeHtml(item.title)}" class="card-backdrop-img" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${item.year || ''}', '${item.quality || 'HD'}');">
      <div class="card-overlay-hover">
        <div class="card-title-mini">${escapeHtml(item.title)}</div>
        <div class="card-meta-mini">
          <span style="color: #ffcc00; font-weight: 700;">★ ${item.rating || '8.5'}</span>
          <span style="color: #bbb; font-weight: 600; font-size: 0.85rem;">${item.year || ''}</span>
          <span class="age-badge">${item.age || '16+'}</span>
          <span class="quality-badge">${item.quality || 'HD'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderRows(categories) {
  rowsContainer.innerHTML = categories.map(cat => {
    if (cat.is_top10) {
      return `
        <div class="netflix-row" data-category="${cat.id}">
          <div class="row-header">
            <h2 class="row-title">${cat.title}</h2>
          </div>
          <div class="row-carousel-wrapper">
            <button class="row-arrow row-arrow-prev" onclick="scrollCarouselRow('${cat.id}', -1)" title="Предыдущие">‹</button>
            <div class="row-carousel" id="carousel_${cat.id}">
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
            <button class="row-arrow row-arrow-next" onclick="scrollCarouselRow('${cat.id}', 1)" title="Следующие">›</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="netflix-row" data-category="${cat.id}">
        <div class="row-header">
          <h2 class="row-title">${cat.title}</h2>
          <span class="row-scroll-hint">Листайте бесконечно ➔</span>
        </div>
        <div class="row-carousel-wrapper">
          <button class="row-arrow row-arrow-prev" onclick="scrollCarouselRow('${cat.id}', -1)" title="Предыдущие">‹</button>
          <div class="row-carousel" id="carousel_${cat.id}" data-category="${cat.id}" data-page="1" onscroll="handleCarouselScroll('${cat.id}')">
            ${cat.items.map(item => renderCardHtml(item)).join('')}
          </div>
          <button class="row-arrow row-arrow-next" onclick="scrollCarouselRow('${cat.id}', 1)" title="Следующие (бесконечные рекомендации)">›</button>
        </div>
      </div>
    `;
  }).join('');
}

const _loadingRows = new Set();

function scrollCarouselRow(catId, dir) {
  const el = document.getElementById(`carousel_${catId}`);
  if (!el) return;
  const scrollAmt = el.clientWidth * 0.75;
  el.scrollBy({ left: dir * scrollAmt, behavior: 'smooth' });
  if (dir > 0) {
    setTimeout(() => handleCarouselScroll(catId), 350);
  }
}

async function handleCarouselScroll(catId) {
  if (catId === 'top10') return;
  const el = document.getElementById(`carousel_${catId}`);
  if (!el || _loadingRows.has(catId)) return;

  const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
  if (remaining < 650) {
    await loadMoreCategoryItems(catId);
  }
}

async function loadMoreCategoryItems(catId) {
  const el = document.getElementById(`carousel_${catId}`);
  if (!el || _loadingRows.has(catId)) return;

  _loadingRows.add(catId);
  const currentPage = parseInt(el.getAttribute('data-page') || '1');
  const nextPage = currentPage + 1;

  const loaderId = `loader_${catId}_${nextPage}`;
  el.insertAdjacentHTML('beforeend', `
    <div class="carousel-loading-item" id="${loaderId}">
      <div class="netflix-spinner-circle" style="width:24px; height:24px;"></div>
      <span>Загрузка...</span>
    </div>
  `);

  try {
    const res = await fetch(`/api/catalog/more?category=${encodeURIComponent(catId)}&page=${nextPage}`);
    const data = await res.json();
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();

    const items = data.items || [];
    if (items.length > 0) {
      el.setAttribute('data-page', nextPage);
      const newCardsHtml = items.map(it => renderCardHtml(it)).join('');
      el.insertAdjacentHTML('beforeend', newCardsHtml);

      const cat = state.catalog?.categories?.find(c => c.id === catId);
      if (cat) {
        cat.items = cat.items || [];
        cat.items.push(...items);
      }
    }
  } catch (err) {
    console.warn('Load more items error for', catId, err);
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
  } finally {
    _loadingRows.delete(catId);
  }
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

function setViewMode(mode) {
  state.viewMode = mode;
  if (btnViewRows) btnViewRows.classList.toggle('active', mode === 'rows');
  if (btnViewCanvas) btnViewCanvas.classList.toggle('active', mode === 'canvas');
  if (rowsContainer) rowsContainer.style.display = (mode === 'rows') ? 'flex' : 'none';
  if (canvasContainer) {
    canvasContainer.style.display = (mode === 'canvas') ? 'grid' : 'none';
    if (mode === 'canvas') renderCanvasItems();
  }
}

function renderCanvasCardHtml(item) {
  const cardImg = item.backdrop || item.poster || generateCardSvg(item.title, item.year, item.quality);
  const cardYear = item.year || item.display_year || '';
  return `
    <div class="grid-card canvas-card" onclick="openMovieDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
      <div class="grid-card-poster-wrap">
        <img src="${cardImg}" class="grid-card-poster-img" alt="${escapeHtml(item.title)}" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${escapeJs(cardYear)}', '${escapeJs(item.quality || 'HD')}');">
        <div class="grid-card-hover-overlay">
          <div class="grid-play-icon">▶</div>
        </div>
        <span class="grid-quality-pill">${escapeHtml(item.quality || '4K UHD')}</span>
        ${item.is_series ? '<span class="grid-season-pill" style="left:auto; right:8px;">Сериал</span>' : ''}
        <div class="grid-card-title-bar">${escapeHtml(item.title)}${cardYear ? ` (${escapeHtml(cardYear)})` : ''}</div>
      </div>
      <div class="grid-card-body">
        <div class="grid-card-meta">
          <span style="color:#ffcc00; font-weight:800;">★ ${item.rating || '8.8'}</span>
          <span>${cardYear}</span>
          <span style="color:#aaa;">${escapeHtml(item.genre || '')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderCanvasItems() {
  if (!canvasContainer) return;
  if (!state.canvasItems || state.canvasItems.length === 0) {
    canvasContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;">Загрузка полотна фильмов...</div>';
    return;
  }
  canvasContainer.innerHTML = state.canvasItems.map(item => renderCanvasCardHtml(item)).join('');
}

async function loadMoreCanvasItems() {
  if (state.canvasLoading) return;
  state.canvasLoading = true;
  state.canvasPage++;
  try {
    const res = await fetch(`/api/catalog/more?category=${encodeURIComponent(state.currentCategory)}&page=${state.canvasPage}`);
    const data = await res.json();
    const items = data.items || [];
    if (items.length > 0) {
      const seen = new Set(state.canvasItems.map(i => i.title));
      const newItems = [];
      for (const it of items) {
        if (!seen.has(it.title)) {
          seen.add(it.title);
          newItems.push(it);
          state.canvasItems.push(it);
        }
      }
      if (newItems.length > 0 && canvasContainer && state.viewMode === 'canvas') {
        const extraHtml = newItems.map(it => renderCanvasCardHtml(it)).join('');
        canvasContainer.insertAdjacentHTML('beforeend', extraHtml);
      }
    }
  } catch (e) {
    console.warn('Canvas load more error:', e);
  } finally {
    state.canvasLoading = false;
  }
}

function switchCategory(cat) {
  state.currentCategory = cat;
  state.canvasPage = 1;

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
    const allSeries = cats.flatMap(c => c.items || []).filter(item => item.is_series);
    const seenS = new Set();
    const dedupedSeries = [];
    for (const s of allSeries) {
      if (!seenS.has(s.title)) { seenS.add(s.title); dedupedSeries.push(s); }
    }
    if (dedupedSeries.length > 0) billboardItem = dedupedSeries[0];
    state.canvasItems = dedupedSeries;

    filteredCats = [
      { id: 'series_trending', title: '🔥 Главные сериалы прямо сейчас', items: dedupedSeries.slice(0, 15) },
      { id: 'series_top', title: '⭐ Шедевры с высоким рейтингом (IMDb 8.5+)', items: dedupedSeries.filter(s => parseFloat(s.rating || '0') >= 8.5) },
      { id: 'series_new', title: '🆕 Свежие премьеры и сезоны 2024', items: dedupedSeries.filter(s => (s.year || '').includes('2024')) },
      { id: 'series_drama', title: '🎭 Драматические и криминальные саги', items: dedupedSeries.filter(s => (s.genre || '').includes('Драма') || (s.genre || '').includes('Криминал')) },
      { id: 'series_scifi_anime', title: '🚀 Фантастика и Аниме-сериалы', items: dedupedSeries.filter(s => (s.genre || '').includes('Фантастика') || (s.genre || '').includes('Анимация') || (s.genre || '').includes('Аниме')) },
      { id: 'series_comedies', title: '😂 Комедийные хиты', items: dedupedSeries.filter(s => (s.genre || '').includes('Комедия')) }
    ].filter(r => r.items && r.items.length > 0);

  } else if (cat === 'movies') {
    const allMovies = cats.flatMap(c => c.items || []).filter(item => !item.is_series);
    const seenM = new Set();
    const dedupedMovies = [];
    for (const m of allMovies) {
      if (!seenM.has(m.title)) { seenM.add(m.title); dedupedMovies.push(m); }
    }
    if (dedupedMovies.length > 0) billboardItem = dedupedMovies[0];
    state.canvasItems = dedupedMovies;

    filteredCats = [
      { id: 'movies_trending', title: '🔥 Главные блокбастеры и кинохиты', items: dedupedMovies.slice(0, 15) },
      { id: 'movies_top', title: '🏆 Золотая коллекция (Рейтинг 8.0+)', items: dedupedMovies.filter(m => parseFloat(m.rating || '0') >= 8.0) },
      { id: 'movies_new', title: '🆕 Премьеры 2024 года', items: dedupedMovies.filter(m => (m.year || '').includes('2024')) },
      { id: 'movies_action', title: '💥 Боевики и триллеры', items: dedupedMovies.filter(m => (m.genre || '').includes('Боевик') || (m.genre || '').includes('Триллер')) },
      { id: 'movies_scifi', title: '🚀 Фантастика и космос', items: dedupedMovies.filter(m => (m.genre || '').includes('Фантастика') || (m.genre || '').includes('Приключения')) },
      { id: 'movies_comedy', title: '😂 Комедии для отличного настроения', items: dedupedMovies.filter(m => (m.genre || '').includes('Комедия')) },
      { id: 'movies_drama', title: '🎭 Глубокие драмы', items: dedupedMovies.filter(m => (m.genre || '').includes('Драма') || (m.genre || '').includes('История')) }
    ].filter(r => r.items && r.items.length > 0);

  } else if (cat === 'trending') {
    filteredCats = cats.filter(c => c.id === 'trending' || c.is_top10 || c.id === 'new_releases');
    billboardItem = state.catalog.billboard;
    state.canvasItems = cats.flatMap(c => c.items || []);

  } else if (cat === 'all') {
    filteredCats = cats;
    billboardItem = state.catalog.billboard;
    const seenAll = new Set();
    const dedupedAll = [];
    for (const c of cats) {
      for (const it of c.items || []) {
        if (!seenAll.has(it.title)) { seenAll.add(it.title); dedupedAll.push(it); }
      }
    }
    state.canvasItems = dedupedAll;

  } else {
    // Exact genre ID match
    const matched = cats.find(c => c.id === cat);
    if (matched && matched.items && matched.items.length > 0) {
      billboardItem = matched.items[0];
      const gItems = matched.items;
      state.canvasItems = gItems;

      filteredCats = [
        { id: `${cat}_top`, title: `🔥 Самые популярные: ${matched.title}`, items: gItems.slice(0, 12) },
        { id: `${cat}_critics`, title: `⭐ Выбор критиков и зрителей (Рейтинг 8.0+)`, items: gItems.filter(i => parseFloat(i.rating || '0') >= 8.0) },
        { id: `${cat}_new`, title: `🆕 Свежие релизы (2023–2024)`, items: gItems.filter(i => (i.year || '').includes('2023') || (i.year || '').includes('2024') || (i.year || '').includes('2025')) },
        { id: `${cat}_all`, title: `👑 Все рекомендации раздела`, items: gItems }
      ].filter(r => r.items && r.items.length > 0);
    } else {
      filteredCats = cats;
      state.canvasItems = cats.flatMap(c => c.items || []);
    }
  }

  // Update active pill styling
  document.querySelectorAll('.genre-pill').forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-genre') === cat);
  });

  if (billboardItem) renderBillboard(billboardItem);
  renderRows(filteredCats);

  if (state.viewMode === 'canvas') {
    renderCanvasItems();
  }
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
          ${item.season_label ? `<span class="grid-season-pill">${escapeHtml(item.season_label)}</span>` : ''}
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
  if (modalRatingBadge) modalRatingBadge.textContent = '★ ' + (movie.rating || '8.8');
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
    state.modalVerified = verified;
    state.modalAllResults = results;

    if (data.movie) {
      if (data.movie.total_seasons) state.activeMovie.total_seasons = data.movie.total_seasons;
      if (data.movie.is_series !== undefined) state.activeMovie.is_series = data.movie.is_series;
    }

    renderModalEditions(verified, results);

    // If series, load episodes from best release (prefer multi-season complete pack or top verified)
    const top = verified.find(r => r.is_multi_season) || verified[0] || results[0];
    const isSeries = state.activeMovie.is_series || (top && (top.title.toLowerCase().includes('сезон') || top.title.toLowerCase().includes('сери') || top.title.toLowerCase().includes('s0')));
    if (isSeries && top) {
      loadEpisodesForModal(top, state.activeMovie);
    }
  } catch (err) {
    modalEditionsList.innerHTML = `<div style="color:#888;">Ошибка загрузки раздач: ${err.message}</div>`;
  }
}

function openMovieDetailsWithTorrents(movie, verified, allResults) {
  state.activeMovie = movie;
  state.modalVerified = verified || [];
  state.modalAllResults = allResults || [];
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

  const top = (verified && (verified.find(r => r.is_multi_season) || verified[0])) || (allResults && allResults[0]);
  const isSeries = movie.is_series || (top && (top.title.toLowerCase().includes('сезон') || top.title.toLowerCase().includes('сери') || top.title.toLowerCase().includes('s0')));
  if (isSeries && top) {
    loadEpisodesForModal(top, movie);
  }
}

async function loadEpisodesForModal(item, movie, preferredSeason = null) {
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

      // Collect all seasons present in this torrent AND across verified / results / total_seasons:
      const torrentSeasons = Object.keys(state.modalSeasons).map(s => parseInt(s)).filter(n => !isNaN(n));
      const maxKnownSeason = Math.max(
        movie?.total_seasons || 1,
        ...(torrentSeasons.length ? torrentSeasons : [1]),
        ...(state.modalVerified || []).map(r => r.season_end || 1),
        ...(state.modalAllResults || []).map(r => r.season_end || 1)
      );

      const allSeasonNums = [];
      for (let s = 1; s <= maxKnownSeason; s++) {
        allSeasonNums.push(s);
      }

      const activeSeason = preferredSeason || (torrentSeasons.length > 0 ? String(torrentSeasons[0]) : '1');
      state.currentModalSeason = String(activeSeason);

      if (allSeasonNums.length > 1) {
        seasonSelect.innerHTML = allSeasonNums.map(s => `
          <option value="${s}" ${String(s) === String(state.currentModalSeason) ? 'selected' : ''}>Сезон ${s}</option>
        `).join('');
      } else if (allSeasonNums.length === 1) {
        seasonSelect.innerHTML = `<option value="${allSeasonNums[0]}">Сезон ${allSeasonNums[0]}</option>`;
      } else {
        seasonSelect.innerHTML = '<option value="1">Серии</option>';
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

async function switchModalSeason(s) {
  state.currentModalSeason = String(s);
  // 1. If currently loaded torrent already has this season's episodes:
  if (state.modalSeasons && state.modalSeasons[s] && state.modalSeasons[s].length > 0) {
    renderModalEpisodesList(state.activeMovie);
    return;
  }

  // 2. Otherwise find a release specifically matching this season in verified / all results
  const sNum = parseInt(s);
  const candidates = [...(state.modalVerified || []), ...(state.modalAllResults || [])];
  const targetRel = candidates.find(r => {
    if (r === state.modalTorrentItem) return false;
    if (r.season_start && r.season_end && sNum >= r.season_start && sNum <= r.season_end) return true;
    if (r.season_label && r.season_label.includes(`Сезон ${sNum}`)) return true;
    const t = (r.title || '').toLowerCase();
    return t.includes(`s0${sNum}`) || t.includes(`s${sNum}`) || t.includes(`${sNum} сезон`) || t.includes(`сезон ${sNum}`);
  });

  if (targetRel) {
    await loadEpisodesForModal(targetRel, state.activeMovie, s);
  } else {
    renderModalEpisodesList(state.activeMovie);
  }
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
    if (badge.includes('СЕЗОН') || badge.includes('НОВИНКА')) tagClass = 'tag-fast-green';

    const isSeriesItem = item.is_series || item.season_label || (state.activeMovie && state.activeMovie.is_series);

    return `
      <div class="edition-item-card">
        <div class="edition-left-info">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
            <span class="edition-badge-tag ${tagClass}">${badge}</span>
            ${item.season_label ? `<span class="ed-pill" style="color:#e5a00d; font-weight:800; background:rgba(229,160,13,0.15); border:1px solid rgba(229,160,13,0.3);">${escapeHtml(item.season_label)}</span>` : ''}
          </div>
          <div class="edition-title">${escapeHtml(item.curated_category || item.title)}</div>
          <div class="edition-details-text">${escapeHtml(item.curated_desc || item.title)}</div>
          <div class="edition-tags-row">
            ${getSeedPill(item.seeds)}
            <span class="ed-pill">${item.quality || 'HD'}</span>
            <span class="ed-pill">${escapeHtml(item.audio || 'Дубляж')}</span>
            <span class="ed-pill">💾 ${item.size}</span>
          </div>
        </div>

        <div class="edition-actions" style="display:flex; gap:8px; align-items:center;">
          ${isSeriesItem ? `
            <button class="n-secondary-btn" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#fff; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:0.85rem;" onclick="loadEpisodesForModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, state.activeMovie)">
              📑 Серии
            </button>
          ` : ''}
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

  const extraHtml = allList.map(item => {
    const isSeriesItem = item.is_series || item.season_label || (state.activeMovie && state.activeMovie.is_series);
    return `
      <div class="edition-item-card" style="border-left: 2px solid #444;">
        <div class="edition-left-info">
          <div class="edition-title" style="font-size:0.95rem;">${escapeHtml(item.title)}</div>
          <div class="edition-tags-row">
            ${getSeedPill(item.seeds)}
            ${item.season_label ? `<span class="ed-pill" style="color:#e5a00d; font-weight:700;">${escapeHtml(item.season_label)}</span>` : ''}
            <span class="ed-pill">${item.source}</span>
            <span class="ed-pill">${item.quality || 'HD'}</span>
            <span class="ed-pill">${escapeHtml(item.audio || 'Звук')}</span>
            <span class="ed-pill">💾 ${item.size}</span>
          </div>
        </div>
        <div class="edition-actions" style="display:flex; gap:8px; align-items:center;">
          ${isSeriesItem ? `
            <button class="n-secondary-btn" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#fff; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;" onclick="loadEpisodesForModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, state.activeMovie)">
              📑 Серии
            </button>
          ` : ''}
          <button class="n-edition-play-btn" onclick="startNetflixStream(${JSON.stringify(item).replace(/"/g, '&quot;')})">
            <span>▶ Смотреть</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

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

    // Voice Modal Controls (Key 'V' to toggle, Esc to close, 1-5 to launch, Enter to play top match)
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal && voiceModal.style.display !== 'none') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeVoiceModal();
        return;
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (_voiceResults && _voiceResults[idx]) {
          e.preventDefault();
          launchMovieDirectly(_voiceResults[idx]);
          return;
        }
      }
      if (e.key === 'Enter' && _voiceResults && _voiceResults.length > 0) {
        e.preventDefault();
        launchMovieDirectly(_voiceResults[0]);
        return;
      }
    }

    // Global Key 'V' opens Voice Search Mode
    if (e.key.toLowerCase() === 'v' && (!netflixPlayerView || netflixPlayerView.style.display !== 'flex')) {
      e.preventDefault();
      if (voiceModal && voiceModal.style.display !== 'none') {
        closeVoiceModal();
      } else {
        openVoiceModal();
      }
      return;
    }

    // Smart TV Mode: Remote D-Pad Navigation (Arrow keys + Enter + Esc)
    if (state.tvMode) {
      if (netflixPlayerView.style.display !== 'flex' && movieDetailModal.style.display !== 'flex') {
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
        if (e.key === 'PageDown') {
          e.preventDefault();
          tvPageNext();
          return;
        }
        if (e.key === 'PageUp') {
          e.preventDefault();
          tvPagePrev();
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

// --- VOICE CONTROL SYSTEM (🎙️ ГОЛОСОВОЙ ПОИСК И МГНОВЕННЫЙ ЗАПУСК) ---
let _voiceRecog = null;
let _isVoiceListening = false;
let _voiceResults = [];
let _voiceAutoRestartTimer = null;

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'ru-RU';
  recog.interimResults = true;
  recog.maxAlternatives = 1;
  recog.continuous = false;

  recog.onstart = () => {
    _isVoiceListening = true;
    updateVoiceMicUI(true);
  };

  recog.onresult = (event) => {
    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const trans = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += trans;
      } else {
        interimText += trans;
      }
    }

    const liveText = finalText || interimText;
    if (liveText) {
      showVoiceTranscript(liveText);
    }

    if (finalText) {
      handleFinalVoiceInput(finalText.trim());
    }
  };

  recog.onerror = (event) => {
    console.warn('Voice recognition notice:', event.error);
    _isVoiceListening = false;
    updateVoiceMicUI(false);
    if (event.error === 'not-allowed') {
      const sub = document.getElementById('voiceStatusSubtitle');
      if (sub) sub.textContent = 'Доступ к микрофону заблокирован в браузере. Разрешите микрофон или введите название фильма вручную.';
    }
  };

  recog.onend = () => {
    _isVoiceListening = false;
    updateVoiceMicUI(false);
  };

  return recog;
}

function openVoiceModal() {
  const modal = document.getElementById('voiceModal');
  if (!modal) return;
  modal.style.display = 'flex';
  _voiceResults = [];
  const resultsGrid = document.getElementById('voiceResultsGrid');
  if (resultsGrid) resultsGrid.innerHTML = '';
  const hint = document.getElementById('voiceChoiceHint');
  if (hint) hint.style.display = 'none';

  const title = document.getElementById('voiceStatusTitle');
  if (title) title.textContent = 'Слушаю вас...';
  const subtitle = document.getElementById('voiceStatusSubtitle');
  if (subtitle) subtitle.textContent = 'Произнесите название фильма или сериала (например: «Аркейн», «Дюна», «Интерстеллар»)';
  const transcriptBox = document.getElementById('voiceTranscriptBox');
  if (transcriptBox) transcriptBox.style.display = 'none';
  const manualInput = document.getElementById('voiceManualInput');
  if (manualInput) manualInput.value = '';

  startVoiceListening();
}

function closeVoiceModal() {
  stopVoiceListening();
  const modal = document.getElementById('voiceModal');
  if (modal) modal.style.display = 'none';
  _voiceResults = [];
}

function closeVoiceModalOnBackdrop(e) {
  if (e.target && e.target.id === 'voiceModal') {
    closeVoiceModal();
  }
}

function toggleVoiceListening() {
  if (_isVoiceListening) {
    stopVoiceListening();
  } else {
    startVoiceListening();
  }
}

function startVoiceListening() {
  if (!_voiceRecog) {
    _voiceRecog = initVoiceRecognition();
  }
  if (!_voiceRecog) {
    const sub = document.getElementById('voiceStatusSubtitle');
    if (sub) sub.textContent = 'Голосовой ввод не поддерживается данным браузером. Введите название фильма в поле ниже:';
    const input = document.getElementById('voiceManualInput');
    if (input) input.focus();
    return;
  }
  try {
    _voiceRecog.start();
  } catch (err) {
    // Already active or restarting
  }
}

function stopVoiceListening() {
  if (_voiceAutoRestartTimer) {
    clearTimeout(_voiceAutoRestartTimer);
    _voiceAutoRestartTimer = null;
  }
  if (_voiceRecog && _isVoiceListening) {
    try {
      _voiceRecog.stop();
    } catch (_) {}
  }
  _isVoiceListening = false;
  updateVoiceMicUI(false);
}

function updateVoiceMicUI(listening) {
  const orb = document.getElementById('voiceMicOrb');
  const waves = document.getElementById('voiceMicWaves');
  if (orb) orb.classList.toggle('listening', listening);
  if (waves) waves.classList.toggle('active', listening);
}

function showVoiceTranscript(text) {
  const box = document.getElementById('voiceTranscriptBox');
  const label = document.getElementById('voiceTranscriptText');
  if (box && label) {
    box.style.display = 'inline-flex';
    label.textContent = text;
  }
}

function parseVoiceSelection(text) {
  const clean = text.toLowerCase().trim();
  const map = {
    'первый': 0, 'первое': 0, 'первая': 0, 'один': 0, '1': 0,
    'второй': 1, 'второе': 1, 'вторая': 1, 'два': 1, '2': 1,
    'третий': 2, 'третье': 2, 'третья': 2, 'три': 2, '3': 2,
    'четвертый': 3, 'четвертое': 3, 'четвертая': 3, 'четыре': 3, '4': 3,
    'пятый': 4, 'пятое': 4, 'пятая': 4, 'пять': 4, '5': 4,
    'запусти': 0, 'включи': 0, 'играй': 0, 'смотреть': 0, 'давай': 0
  };
  for (const [key, idx] of Object.entries(map)) {
    if (clean === key || clean.startsWith(key + ' ') || clean.endsWith(' ' + key)) return idx;
  }
  return -1;
}

async function handleFinalVoiceInput(spokenText) {
  if (!spokenText) return;

  // If choices are already displayed, check if the user said a selection ("первый", "второй", "1", "2")
  if (_voiceResults && _voiceResults.length > 0) {
    const choiceIdx = parseVoiceSelection(spokenText);
    if (choiceIdx >= 0 && choiceIdx < _voiceResults.length) {
      launchMovieDirectly(_voiceResults[choiceIdx]);
      return;
    }
  }

  // Otherwise, treat as a film search query
  await executeVoiceSearch(spokenText);
}

async function executeVoiceSearch(query) {
  if (!query || !query.trim()) return;
  const q = query.trim();
  stopVoiceListening();

  showVoiceTranscript(q);
  const statusTitle = document.getElementById('voiceStatusTitle');
  if (statusTitle) statusTitle.textContent = `Поиск: «${q}»...`;
  const statusSub = document.getElementById('voiceStatusSubtitle');
  if (statusSub) statusSub.textContent = 'Ищем лучшие раздачи с высоким качеством и звуком...';

  const grid = document.getElementById('voiceResultsGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 36px; text-align: center; color: #aaa;">
        <div class="netflix-spinner-circle" style="width: 36px; height: 36px; margin: 0 auto 12px;"></div>
        Поиск фильма «${escapeHtml(q)}»...
      </div>
    `;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&source=all`);
    const data = await res.json();
    const verified = data.verified_editions || [];
    const results = data.results || [];
    const movieMeta = data.movie;

    const candidates = [];
    const seen = new Set();

    // 1. Add verified editions first (Multi-season pack, Latest season, 1080p BD)
    for (const v of verified) {
      const key = v.id || v.title;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          id: v.id,
          title: v.season_label ? `${movieMeta?.title || v.title} • ${v.season_label}` : (v.curated_category || v.title),
          poster: v.poster || movieMeta?.poster,
          backdrop: v.backdrop || movieMeta?.backdrop,
          year: v.display_year || movieMeta?.year || '2024',
          rating: movieMeta?.rating || '8.8',
          quality: v.quality || 'Full HD',
          seeds: v.seeds,
          badge: v.curated_badge || '⭐ ПРОВЕРЕННАЯ РАЗДАЧА',
          torrent_item: v
        });
      }
    }

    // 2. Add top releases from results
    for (const r of results) {
      const key = r.id || r.title;
      if (!seen.has(key) && candidates.length < 5) {
        seen.add(key);
        candidates.push({
          id: r.id,
          title: r.display_title || r.title,
          poster: r.poster || movieMeta?.poster,
          backdrop: r.backdrop || movieMeta?.backdrop,
          year: r.display_year || r.date || '2024',
          rating: r.rating || movieMeta?.rating || '8.5',
          quality: r.quality || 'HD',
          seeds: r.seeds,
          badge: r.season_label || `${r.seeds} сидов`,
          torrent_item: r
        });
      }
    }

    _voiceResults = candidates;

    if (!candidates.length) {
      if (statusTitle) statusTitle.textContent = `По запросу «${q}» ничего не найдено`;
      if (statusSub) statusSub.textContent = 'Попробуйте произнести название иначе или воспользуйтесь строкой ввода.';
      if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; color: #888;">Раздачи не найдены. Нажмите на микрофон и попробуйте снова.</div>';
      return;
    }

    if (statusTitle) statusTitle.textContent = `Выберите вариант:`;
    if (statusSub) statusSub.textContent = `Найдено вариантов: ${candidates.length}. Фильм запустится сразу после выбора!`;
    const hint = document.getElementById('voiceChoiceHint');
    if (hint) hint.style.display = 'flex';

    if (grid) {
      grid.innerHTML = candidates.map((item, idx) => {
        const choiceNum = idx + 1;
        const img = item.backdrop || item.poster || generateCardSvg(item.title, item.year, item.quality);
        const isTop = (idx === 0);
        return `
          <div class="voice-card ${isTop ? 'voice-card-top' : ''}" onclick="launchMovieDirectly(_voiceResults[${idx}])" id="voiceCard_${idx}">
            <div class="voice-card-choice-num">${choiceNum}</div>
            <div class="voice-card-thumb-wrap">
              <img src="${img}" alt="${escapeHtml(item.title)}" class="voice-card-img" onerror="this.onerror=null; this.src=generateCardSvg('${escapeJs(item.title)}', '${item.year || ''}', '${item.quality || 'HD'}');">
            </div>
            <div class="voice-card-body">
              <div class="voice-card-title">${escapeHtml(item.title)}</div>
              <div class="voice-card-meta">
                <span style="color:#ffcc00; font-weight:800;">★ ${item.rating || '8.8'}</span>
                <span>${item.year}</span>
                <span class="quality-badge">${escapeHtml(item.quality || 'HD')}</span>
              </div>
              <button class="voice-card-play-btn" onclick="event.stopPropagation(); launchMovieDirectly(_voiceResults[${idx}])">
                ▶ Запустить [${choiceNum}]
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Auto-listen for choice command ("первый", "второй", "1", "2") after 600ms
    _voiceAutoRestartTimer = setTimeout(() => {
      startVoiceListening();
    }, 600);

  } catch (err) {
    if (statusTitle) statusTitle.textContent = 'Ошибка поиска';
    if (statusSub) statusSub.textContent = err.message;
    if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; color: #ff6b6b; padding: 20px;">${err.message}</div>`;
  }
}

async function launchMovieDirectly(item) {
  closeVoiceModal();
  if (!item) return;

  const torrentItem = item.torrent_item || item;
  if (torrentItem && (torrentItem.magnet || torrentItem.topic_id)) {
    startNetflixStream(torrentItem);
    return;
  }

  // Fallback if item is plain metadata
  const q = item.search_query || item.title;
  netflixPlayerView.style.display = 'flex';
  playerTitle.textContent = item.title;
  playerSubtitle.textContent = 'Мгновенный запуск фильма в обход VPN...';
  playerSpinner.style.display = 'flex';
  spinnerText.textContent = `Подключение к «${item.title}»...`;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&source=all`);
    const data = await res.json();
    const verified = data.verified_editions || [];
    const results = data.results || [];
    const top = verified.find(r => r.is_multi_season) || verified[0] || results[0];
    if (!top) throw new Error('Раздачи не найдены');
    startNetflixStream(top);
  } catch (e) {
    alert('Не удалось запустить фильм: ' + e.message);
    exitNetflixPlayer();
  }
}

// --- SMART TV MODE ENGINE (REMOTE / ARROWS / NUMBERS 0-9) ---
function toggleTvMode() {
  setTvMode(!state.tvMode);
}

function setTvMode(enable) {
  state.tvMode = enable;
  localStorage.setItem('kinoflix_tv_mode', enable ? 'true' : 'false');
  document.body.classList.toggle('tv-mode', enable);
  document.documentElement.classList.toggle('tv-mode', enable);

  if (tvModeBtnText) {
    tvModeBtnText.textContent = enable ? 'ТВ Активен' : 'Для ТВ';
  }

  const uiSelect = document.getElementById('uiModeSelect');
  if (uiSelect) {
    uiSelect.value = enable ? 'tv' : 'desktop';
  }

  if (enable) {
    window.scrollTo(0, 0);
    homeView.style.display = 'none';
    searchResultsView.style.display = 'none';
    if (downloadsView) downloadsView.style.display = 'none';
    if (tvView) tvView.style.display = 'flex';
    state.tvZone = 'cards';
    state.tvFocusIndex = 0;
    state.tvBottomIndex = 1;
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
  state.tvPageApi = 1;

  const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
  tabs.forEach((t, idx) => {
    const isMatch = (t.getAttribute('data-tv-cat') === cat);
    t.classList.toggle('active', isMatch);
    if (isMatch) state.tvTabIndex = idx;
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

  const prevBtn = document.getElementById('tvPrevBtn');
  if (prevBtn) {
    prevBtn.style.opacity = (state.tvPageIndex === 0) ? '0.4' : '1';
    prevBtn.style.pointerEvents = (state.tvPageIndex === 0) ? 'none' : 'auto';
  }
  const nextBtn = document.getElementById('tvNextBtn');
  if (nextBtn) {
    const isLast = (state.tvPageIndex >= maxPages - 1);
    nextBtn.style.opacity = isLast ? '0.4' : '1';
    nextBtn.style.pointerEvents = isLast ? 'none' : 'auto';
  }

  if (pageItems.length === 0) {
    tvCardsGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #888; font-size: 1.2rem;">Элементы не найдены. Выберите другую категорию или выполните поиск.</div>';
    return;
  }

  if (state.tvFocusIndex >= pageItems.length) {
    state.tvFocusIndex = Math.max(0, pageItems.length - 1);
  }
  if (state.tvFocusIndex < 0) state.tvFocusIndex = 0;

  tvCardsGrid.innerHTML = pageItems.map((item, idx) => {
    return `
      <div class="tv-card" id="tvCard_${idx}" onclick="handleTvCardClick(${idx})">
        <div class="tv-card-thumb-wrap">
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
  // Clear focus class from all elements across all TV zones
  document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('tv-focused'));
  document.querySelectorAll('.tv-tab').forEach(t => t.classList.remove('tv-focused'));
  const exitBtn = document.getElementById('tvExitBtn');
  if (exitBtn) exitBtn.classList.remove('tv-focused');
  const bottomBtns = [
    document.getElementById('tvPrevBtn'),
    document.getElementById('tvNextBtn'),
    document.getElementById('tvVoiceNavBtn'),
    document.getElementById('tvSearchBtn')
  ];
  bottomBtns.forEach(b => { if (b) b.classList.remove('tv-focused'); });

  if (state.tvZone === 'cards') {
    const focusedCard = document.getElementById(`tvCard_${state.tvFocusIndex}`);
    if (focusedCard) {
      focusedCard.classList.add('tv-focused');
    }
  } else if (state.tvZone === 'tabs') {
    const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
    if (tabs.length > 0) {
      if (state.tvTabIndex >= tabs.length) state.tvTabIndex = tabs.length - 1;
      if (state.tvTabIndex < 0) state.tvTabIndex = 0;
      const curTab = tabs[state.tvTabIndex];
      curTab.classList.add('tv-focused');
      // Scroll horizontally within tvTabsBar without scrolling the window
      const bar = document.getElementById('tvTabsBar');
      if (bar) {
        const tabLeft = curTab.offsetLeft;
        const tabRight = tabLeft + curTab.offsetWidth;
        if (tabLeft < bar.scrollLeft) {
          bar.scrollTo({ left: Math.max(0, tabLeft - 30), behavior: 'smooth' });
        } else if (tabRight > bar.scrollLeft + bar.clientWidth) {
          bar.scrollTo({ left: tabRight - bar.clientWidth + 30, behavior: 'smooth' });
        }
      }
    }
  } else if (state.tvZone === 'header') {
    if (exitBtn) {
      exitBtn.classList.add('tv-focused');
    }
  } else if (state.tvZone === 'bottom') {
    if (state.tvBottomIndex < 0) state.tvBottomIndex = 0;
    if (state.tvBottomIndex > 2) state.tvBottomIndex = 2;
    const btn = bottomBtns[state.tvBottomIndex];
    if (btn) {
      btn.classList.add('tv-focused');
    }
  }
}

function handleTvCardClick(idx) {
  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);
  const item = pageItems[idx];
  if (!item) return;

  state.tvZone = 'cards';
  state.tvFocusIndex = idx;
  updateTvFocus();

  if (item.is_download) {
    playLocalDownload(item.filename, item.title);
  } else {
    openMovieDetails(item);
  }
}

function handleTvArrowKey(key) {
  const pageItems = state.tvItems.slice(state.tvPageIndex * 10, (state.tvPageIndex + 1) * 10);
  const cols = (window.innerWidth <= 1200) ? 2 : 5;
  const N = pageItems.length;
  const totalRows = Math.ceil(N / cols);

  // ZONE: CARDS GRID
  if (state.tvZone === 'cards') {
    if (N === 0) {
      if (key === 'ArrowUp') state.tvZone = 'tabs';
      else if (key === 'ArrowDown') state.tvZone = 'bottom';
      updateTvFocus();
      return;
    }

    const row = Math.floor(state.tvFocusIndex / cols);
    const col = state.tvFocusIndex % cols;

    if (key === 'ArrowLeft') {
      if (state.tvFocusIndex > 0) {
        state.tvFocusIndex--;
      }
    } else if (key === 'ArrowRight') {
      if (state.tvFocusIndex < N - 1) {
        state.tvFocusIndex++;
      }
    } else if (key === 'ArrowUp') {
      if (row > 0) {
        // Move up to previous row within cards
        state.tvFocusIndex -= cols;
      } else {
        // Move UP from Row 1 into Category Tabs! (Never jumps page!)
        state.tvZone = 'tabs';
        const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
        const activeIdx = Array.from(tabs).findIndex(t => t.classList.contains('active'));
        state.tvTabIndex = (activeIdx >= 0) ? activeIdx : Math.min(col, tabs.length - 1);
      }
    } else if (key === 'ArrowDown') {
      if (row < totalRows - 1) {
        // Move down to next row within cards
        const nextIdx = state.tvFocusIndex + cols;
        state.tvFocusIndex = Math.min(nextIdx, N - 1);
      } else {
        // Move DOWN from Row 2 into Bottom Action Bar! (Never jumps page!)
        state.tvZone = 'bottom';
        if (col <= 1) {
          state.tvBottomIndex = 0; // Prev
        } else if (col === 2) {
          state.tvBottomIndex = 1; // Next
        } else if (col === 3) {
          state.tvBottomIndex = 2; // Voice
        } else {
          state.tvBottomIndex = 3; // Search
        }
      }
    }
    updateTvFocus();
    return;
  }

  // ZONE: CATEGORY TABS
  if (state.tvZone === 'tabs') {
    const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
    const tabsCount = tabs.length;

    if (key === 'ArrowLeft') {
      if (state.tvTabIndex > 0) {
        state.tvTabIndex--;
      }
    } else if (key === 'ArrowRight') {
      if (state.tvTabIndex < tabsCount - 1) {
        state.tvTabIndex++;
      } else {
        // Moving right from the last tab focuses the exit button
        state.tvZone = 'header';
      }
    } else if (key === 'ArrowUp') {
      // Move UP to Header (Exit button)
      state.tvZone = 'header';
    } else if (key === 'ArrowDown') {
      // Move DOWN into cards (Row 1)
      if (N > 0) {
        state.tvZone = 'cards';
        state.tvFocusIndex = Math.min(state.tvTabIndex % cols, N - 1);
      } else {
        state.tvZone = 'bottom';
      }
    }
    updateTvFocus();
    return;
  }

  // ZONE: HEADER (EXIT BUTTON)
  if (state.tvZone === 'header') {
    if (key === 'ArrowDown') {
      state.tvZone = 'tabs';
    } else if (key === 'ArrowLeft') {
      state.tvZone = 'tabs';
      const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
      state.tvTabIndex = Math.max(0, tabs.length - 1);
    }
    updateTvFocus();
    return;
  }

  // ZONE: BOTTOM ACTION BUTTONS
  if (state.tvZone === 'bottom') {
    if (key === 'ArrowLeft') {
      if (state.tvBottomIndex > 0) state.tvBottomIndex--;
    } else if (key === 'ArrowRight') {
      if (state.tvBottomIndex < 3) state.tvBottomIndex++;
    } else if (key === 'ArrowUp') {
      // Move UP into the bottom row of cards!
      if (N > 0) {
        state.tvZone = 'cards';
        const lastRowStart = (totalRows - 1) * cols;
        const targetCol = (state.tvBottomIndex === 0) ? 0 : (state.tvBottomIndex === 1 ? 1 : (state.tvBottomIndex === 2 ? 3 : cols - 1));
        state.tvFocusIndex = Math.min(N - 1, lastRowStart + targetCol);
      } else {
        state.tvZone = 'tabs';
      }
    } else if (key === 'ArrowDown') {
      // Stays in bottom buttons, does NOT jump page
    }
    updateTvFocus();
    return;
  }
}

function handleTvEnter() {
  if (state.tvZone === 'cards') {
    handleTvCardClick(state.tvFocusIndex);
  } else if (state.tvZone === 'tabs') {
    const tabs = document.querySelectorAll('#tvTabsBar .tv-tab');
    if (tabs[state.tvTabIndex]) {
      tabs[state.tvTabIndex].click();
    }
  } else if (state.tvZone === 'header') {
    setTvMode(false);
  } else if (state.tvZone === 'bottom') {
    if (state.tvBottomIndex === 0) {
      tvPagePrev();
    } else if (state.tvBottomIndex === 1) {
      tvPageNext();
    } else if (state.tvBottomIndex === 2) {
      openVoiceModal();
    } else if (state.tvBottomIndex === 3) {
      tvOpenSearchPrompt();
    }
  }
}

function handleTvBack() {
  if (netflixPlayerView.style.display === 'flex') {
    exitNetflixPlayer();
  } else if (movieDetailModal.style.display === 'flex') {
    closeDetailModal();
  } else if (state.tvZone === 'bottom' || state.tvZone === 'tabs' || state.tvZone === 'header') {
    state.tvZone = 'cards';
    updateTvFocus();
  } else if (state.tvPageIndex > 0) {
    tvPagePrev();
  } else if (state.tvCategory !== 'all') {
    switchTvCategory('all');
  } else {
    setTvMode(false);
  }
}

let _loadingTvMore = false;
async function checkAndLoadMoreTvItems() {
  if (_loadingTvMore || state.tvCategory === 'downloads') return;
  const total = state.tvItems.length;
  const remaining = total - (state.tvPageIndex * 10);
  if (remaining < 25) {
    _loadingTvMore = true;
    state.tvPageApi = (state.tvPageApi || 1) + 1;
    try {
      const res = await fetch(`/api/catalog/more?category=${encodeURIComponent(state.tvCategory)}&page=${state.tvPageApi}`);
      const data = await res.json();
      const items = data.items || [];
      if (items.length > 0) {
        const existing = new Set(state.tvItems.map(i => i.title));
        for (const it of items) {
          if (!existing.has(it.title)) {
            existing.add(it.title);
            state.tvItems.push(it);
          }
        }
        renderTvCards();
      }
    } catch (e) {
      console.warn('TV load more error:', e);
    } finally {
      _loadingTvMore = false;
    }
  }
}

async function tvPageNext() {
  const total = state.tvItems.length;
  const maxPages = Math.ceil(total / 10);
  if (state.tvPageIndex < maxPages - 1) {
    state.tvPageIndex++;
    state.tvFocusIndex = 0;
    renderTvCards();
    checkAndLoadMoreTvItems();
  } else {
    await checkAndLoadMoreTvItems();
    const newTotal = state.tvItems.length;
    const newMax = Math.ceil(newTotal / 10);
    if (state.tvPageIndex < newMax - 1) {
      state.tvPageIndex++;
      state.tvFocusIndex = 0;
      renderTvCards();
    }
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
