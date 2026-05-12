/* ui.js — card modal + filters + degradation banner + prefetch modal + QR modal
 *
 * Exposed as: window.__UI__ = {
 *   openCard, closeCard, toggleListView,
 *   setDayFilter, setCategoryFilter, setQuery,
 *   renderDegradationBanner, attachHandlers,
 *   showPrefetchModal, hidePrefetchModal, showQrModal
 * }
 */
(function () {
  'use strict';

  // ── Degradation banner ─────────────────────────────────────────────
  var BANNER_TEXT = {
    normal:         '',
    offline:        '⚠️ 오프라인 모드 — 캐시된 타일·데이터만 표시',
    portal_blocked: '⚠️ Wi-Fi 인증 필요 — 호텔/카페 와이파이 로그인 페이지 확인',
    low_battery:    '🔋 절전 모드 — 애니메이션·위치 추적 일시 정지'
  };

  function renderDegradationBanner() {
    var el = document.getElementById('degBanner');
    if (!el) return;
    var state = window.__BETA1_STATE__.get();
    var mode = state ? state.degradationMode : 'normal';
    el.textContent = BANNER_TEXT[mode] || '';
    el.className = 'degradation-banner' + (mode !== 'normal' ? ' ' + mode : '');
  }

  // ── Card modal (bottom sheet) ──────────────────────────────────────
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function metaChip(label, cls) {
    return '<span class="meta-chip ' + (cls || '') + '">' + escapeHtml(label) + '</span>';
  }

  function renderCard(stop) {
    var state = window.__BETA1_STATE__;
    var bits = [];
    bits.push('<h2 class="card-title">' + escapeHtml(stop.nameKr) + '</h2>');
    if (stop.nameCn) bits.push('<div class="card-cn">' + escapeHtml(stop.nameCn) + '</div>');

    var chips = [];
    if (stop.approx) chips.push(metaChip('APPROX', 'approx'));
    if (state.shouldDisplayField(stop, 'priceRange')) chips.push(metaChip(stop.priceRange));
    if (state.shouldDisplayField(stop, 'hours'))      chips.push(metaChip('🕐 ' + stop.hours));
    if (state.shouldDisplayField(stop, 'reservation'))chips.push(metaChip('📞 ' + stop.reservation));
    if (state.shouldDisplayField(stop, 'krMenu') && stop.krMenu) chips.push(metaChip('🇰🇷 한국어 메뉴'));
    if (Array.isArray(stop.payment) && stop.payment.indexOf('alipay') !== -1) {
      chips.push(metaChip('알리페이 가능', 'alipay'));
    }
    if (Array.isArray(stop.payment) && stop.payment.indexOf('cash') !== -1) {
      chips.push(metaChip('현금 가능'));
    }
    if (chips.length) bits.push('<div class="meta-row">' + chips.join('') + '</div>');

    if (stop.desc) bits.push('<p class="card-desc">' + escapeHtml(stop.desc) + '</p>');

    // Closed days (if present)
    if (Array.isArray(stop.closedDays) && stop.closedDays.length) {
      bits.push('<div class="meta-row">' + metaChip('휴무 ' + stop.closedDays.join(', ')) + '</div>');
    }

    // YouTube videos with timestamps (data.js TIMESTAMPS keyed by slug → videoNum)
    if (Array.isArray(stop.videos) && stop.videos.length) {
      var ts = (window.__DATA__.TIMESTAMPS || {})[stop.slug] || {};
      var links = stop.videos.map(function (v) {
        var entry = ts[String(v.num)];
        if (entry && entry.url) {
          return '<a href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener">#' + v.num + ' ' + escapeHtml(v.channel) + ' [' + escapeHtml(entry.ts_label) + ']</a>';
        }
        return '<span>#' + v.num + ' ' + escapeHtml(v.channel) + '</span>';
      }).join(' ');
      bits.push('<div class="videos">📺 ' + links + '</div>');
    }

    // Korean reviews (curated)
    if (Array.isArray(stop.krReviews) && stop.krReviews.length) {
      var reviews = stop.krReviews.map(function (r) {
        return '<blockquote>“' + escapeHtml(r.quote) + '” — <a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener">' + escapeHtml(r.source) + '</a></blockquote>';
      }).join('');
      bits.push(reviews);
    }

    return bits.join('');
  }

  function openCard(slug) {
    var state = window.__BETA1_STATE__.get();
    var stop = state && state.stopsBySlug.get(slug);
    if (!stop) return;
    window.__BETA1_STATE__.setSelected(slug);
    var card = document.getElementById('stopCard');
    var body = document.getElementById('cardBody');
    body.innerHTML = renderCard(stop);
    card.classList.add('open');
  }

  function closeCard() {
    var card = document.getElementById('stopCard');
    if (card) card.classList.remove('open');
    window.__BETA1_STATE__.setSelected(null);
  }

  // ── List view ──────────────────────────────────────────────────────
  function renderListView() {
    var state = window.__BETA1_STATE__.get();
    if (!state) return;
    var lv = document.getElementById('listView');
    var html = state.stops.map(function (s) {
      var icon = (window.__ICONS__ && window.__ICONS__.svg(s.categoryIconKey, 'white', 18)) || '';
      return '<div class="list-item" data-slug="' + escapeHtml(s.slug) + '">' +
        '<div class="list-icon cat-' + escapeHtml(s.category) + '">' + icon + '</div>' +
        '<div><div>' + escapeHtml(s.nameKr) + '</div>' +
        '<div style="color:var(--fg-dim);font-size:0.78rem">' + escapeHtml(s.nameCn || '') + '</div></div>' +
        '</div>';
    }).join('');
    lv.innerHTML = html;
    lv.querySelectorAll('.list-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var slug = el.dataset.slug;
        toggleListView(false);
        if (window.__MAP__) window.__MAP__.flyToStop(slug);
        openCard(slug);
      });
    });
  }

  function toggleListView(force) {
    var lv = document.getElementById('listView');
    if (!lv) return;
    var open = (typeof force === 'boolean') ? force : !lv.classList.contains('open');
    lv.classList.toggle('open', open);
    if (open) renderListView();
  }

  // ── Filters ────────────────────────────────────────────────────────
  function setDayFilter(day) {
    var d = day === 'all' ? null : (day ? Number(day) : null);
    window.__BETA1_STATE__.setFilter({ day: d });
    if (window.__MAP__) window.__MAP__.refreshMarkers();
  }

  function setCategoryFilter(cat) {
    window.__BETA1_STATE__.setFilter({ category: cat || null });
    if (window.__MAP__) window.__MAP__.refreshMarkers();
  }

  var QUERY_DEBOUNCE = null;
  function setQuery(q) {
    clearTimeout(QUERY_DEBOUNCE);
    QUERY_DEBOUNCE = setTimeout(function () {
      window.__BETA1_STATE__.setFilter({ query: q || '' });
      if (window.__MAP__) window.__MAP__.refreshMarkers();
    }, 80);
  }

  // ── Modals (prefetch + QR) ─────────────────────────────────────────
  function showModal(html) {
    var ov = document.getElementById('modalOverlay');
    var body = document.getElementById('modalBody');
    body.innerHTML = html;
    ov.classList.add('open');
  }

  function hideModal() {
    var ov = document.getElementById('modalOverlay');
    ov.classList.remove('open');
  }

  function showPrefetchModal() {
    var html =
      '<h2>오프라인 준비</h2>' +
      '<p>출국 전 와이파이에서 1회 다운로드. 약 15MB 의 상하이 시내 지도 타일을 캐시해 비행기 모드에서도 동작합니다.</p>' +
      '<div class="progress-bar" id="prefetchBar" style="display:none"><div style="width:0%"></div></div>' +
      '<div class="actions">' +
        '<button id="prefetchLater" type="button">나중에</button>' +
        '<button id="prefetchStart" type="button" class="primary">확인</button>' +
      '</div>';
    showModal(html);
    document.getElementById('prefetchLater').onclick = function () {
      localStorage.setItem('modalDismissedAt', String(Date.now()));
      hideModal();
    };
    document.getElementById('prefetchStart').onclick = function () { triggerPrefetch(); };
  }

  function triggerPrefetch() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      alert('Service Worker 미준비. 페이지 새로고침 후 재시도.');
      return;
    }
    var bar = document.getElementById('prefetchBar');
    if (bar) bar.style.display = 'block';
    var urls = buildPrefetchUrls();
    navigator.serviceWorker.controller.postMessage({ type: 'prefetch-tiles', urls: urls });
    var ch = new BroadcastChannel('cache-status');
    ch.onmessage = function (e) {
      if (e.data.type === 'progress' && bar) {
        bar.firstElementChild.style.width = (100 * e.data.ok / e.data.total).toFixed(1) + '%';
      }
      if (e.data.type === 'complete') {
        if (e.data.success) localStorage.setItem('tilePrefetchedAt', String(Date.now()));
        setTimeout(hideModal, 800);
        ch.close();
      }
    };
  }

  function buildPrefetchUrls() {
    // Shanghai bbox (rough): lat 31.18..31.30, lng 121.40..121.55
    var subs = ['1','2','3','4'];
    var urls = [];
    var bbox = { south: 31.18, north: 31.30, west: 121.40, east: 121.55 };
    function lonLatToXY(lng, lat, z) {
      var n = Math.pow(2, z);
      var x = Math.floor((lng + 180) / 360 * n);
      var y = Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI) / 2 * n);
      return { x: x, y: y };
    }
    for (var z = 12; z <= 16; z++) {
      var tl = lonLatToXY(bbox.west, bbox.north, z);
      var br = lonLatToXY(bbox.east, bbox.south, z);
      for (var x = tl.x; x <= br.x; x++) {
        for (var y = tl.y; y <= br.y; y++) {
          var s = subs[(x + y) % 4];
          urls.push('https://wprd0' + s + '.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x=' + x + '&y=' + y + '&z=' + z);
        }
      }
    }
    return urls;
  }

  function showQrModal(url) {
    var html =
      '<h2>QR 공유</h2>' +
      '<p style="word-break:break-all;font-size:0.78rem">' + escapeHtml(url) + '</p>' +
      '<div id="qrCanvas" style="display:flex;justify-content:center;margin:12px 0"></div>' +
      '<div class="actions"><button id="qrClose" class="primary" type="button">닫기</button></div>';
    showModal(html);
    document.getElementById('qrClose').onclick = hideModal;
    var canvas = document.getElementById('qrCanvas');
    if (window.qrcode) {
      var qr = window.qrcode(0, 'L');
      qr.addData(url);
      qr.make();
      canvas.innerHTML = qr.createImgTag(5, 8);
    } else {
      canvas.textContent = '(qrcode-generator vendor 미로드 — vendor/qrcode-generator.min.js 필요)';
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────
  function attachHandlers() {
    document.getElementById('cardClose').onclick = closeCard;

    document.getElementById('btnList').onclick = function () { toggleListView(); };
    document.getElementById('btnDay').onclick = function () {
      // Cycle: all → 1 → 2 → 3 → all
      var st = window.__BETA1_STATE__.get();
      var d = st.activeFilter.day;
      var next = d === null ? 1 : (d === 1 ? 2 : (d === 2 ? 3 : null));
      setDayFilter(next === null ? 'all' : next);
      Array.prototype.forEach.call(document.querySelectorAll('.day-filter button'), function (b) {
        b.classList.toggle('active', b.dataset.day === (next === null ? 'all' : String(next)));
      });
    };

    Array.prototype.forEach.call(document.querySelectorAll('.day-filter button'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('.day-filter button'), function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        setDayFilter(btn.dataset.day);
      });
    });

    document.getElementById('btnPrefetch').onclick = showPrefetchModal;
    document.getElementById('btnShare').onclick = function () {
      var st = window.__BETA1_STATE__.get();
      var slug = st.selectedSlug;
      var url = window.location.origin + window.location.pathname + (slug ? ('?stop=' + slug) : '');
      showQrModal(url);
    };
    document.getElementById('searchInput').addEventListener('input', function (e) { setQuery(e.target.value); });

    document.getElementById('modalOverlay').addEventListener('click', function (e) {
      if (e.target.id === 'modalOverlay') hideModal();
    });

    // Listen for SW health/cache messages
    if ('BroadcastChannel' in window) {
      var ch = new BroadcastChannel('cache-status');
      ch.onmessage = function (e) {
        if (e.data.type === 'health') {
          window.__BETA1_STATE__.setCacheStatus({ ready: true });
        }
        if (e.data.type === 'portal') {
          window.__BETA1_STATE__.setDegradationMode('portal_blocked');
          renderDegradationBanner();
        }
      };
    }

    // Initial banner render
    renderDegradationBanner();

    // Battery API → low_battery hint (best-effort)
    if (navigator.getBattery) {
      navigator.getBattery().then(function (bat) {
        function update() {
          if (bat.level <= 0.2 && !bat.charging) {
            window.__BETA1_STATE__.setDegradationMode('low_battery');
            renderDegradationBanner();
          }
        }
        bat.addEventListener('levelchange', update);
        bat.addEventListener('chargingchange', update);
        update();
      }).catch(function () { /* iOS Safari unsupported */ });
    }

    // Online/offline events
    window.addEventListener('offline', function () {
      window.__BETA1_STATE__.setDegradationMode('offline');
      renderDegradationBanner();
    });
    window.addEventListener('online', function () {
      window.__BETA1_STATE__.setDegradationMode('normal');
      renderDegradationBanner();
    });
  }

  window.__UI__ = {
    openCard: openCard,
    closeCard: closeCard,
    toggleListView: toggleListView,
    setDayFilter: setDayFilter,
    setCategoryFilter: setCategoryFilter,
    setQuery: setQuery,
    renderDegradationBanner: renderDegradationBanner,
    attachHandlers: attachHandlers,
    showPrefetchModal: showPrefetchModal,
    showQrModal: showQrModal
  };
})();
