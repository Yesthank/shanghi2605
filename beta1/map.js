/* map.js — Leaflet init + tile variant + 26 markers + day polylines + geolocation
 *
 * Tile source picked at build time via window.__DATA__.VARIANT:
 *   'cn'   → Gaode raster (https://wprd0{1-4}.is.autonavi.com)
 *   'intl' → OpenStreetMap (KR verification only — OSM blocked in CN per Codex peer-review)
 *   '__VARIANT__' (unsubstituted, dev mode) → fallback to OSM
 *
 * Exposed as: window.__MAP__ = { init, refreshMarkers, flyToStop, getMap }
 * Marker click → window.__UI__.openCard(slug) (unidirectional)
 */
(function () {
  'use strict';

  var MAP = null;
  var MARKERS = new Map(); // slug -> L.Marker
  var POLYLINES = new Map(); // day -> L.Polyline
  var TILE_LAYER = null;
  var GAODE_FAIL_COUNT = 0;
  var GAODE_FAIL_THRESHOLD = 5;

  var GAODE_URL = 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
  var OSM_URL   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  function pickTileLayer(variant) {
    if (variant === 'cn') {
      return L.tileLayer(GAODE_URL, {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        attribution: '© AutoNavi/Gaode'
      });
    }
    return L.tileLayer(OSM_URL, {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    });
  }

  function init() {
    if (MAP) return MAP;
    var data = window.__DATA__;
    var variant = data && data.VARIANT;
    var resolvedVariant = (variant === 'cn' || variant === 'intl') ? variant : 'intl';

    MAP = L.map('map', {
      center: [31.2308, 121.479], // hotel
      zoom: 14,
      zoomControl: true,
      attributionControl: true
    });

    TILE_LAYER = pickTileLayer(resolvedVariant);

    // Gaode auto-fallback to OSM after 5 tile errors (PM-2 + ADR-002 build-time decision is preferred,
    // but runtime safety net protects against intermittent referrer/IP blocking)
    TILE_LAYER.on('tileerror', function () {
      if (resolvedVariant !== 'cn') return;
      GAODE_FAIL_COUNT++;
      if (GAODE_FAIL_COUNT >= GAODE_FAIL_THRESHOLD && TILE_LAYER._url !== OSM_URL) {
        console.warn('[map.js] Gaode tile errors >= ' + GAODE_FAIL_THRESHOLD + ', switching to OSM');
        TILE_LAYER.setUrl(OSM_URL);
        TILE_LAYER.options.subdomains = ['a', 'b', 'c'];
        if (window.__BETA1_STATE__) window.__BETA1_STATE__.setDegradationMode('offline');
      }
    });

    TILE_LAYER.addTo(MAP);

    MAP.on('click', function () {
      if (window.__UI__) window.__UI__.closeCard();
    });

    requestGeolocation();
    return MAP;
  }

  function categoryColorClass(stop) {
    return 'cat-' + (stop.category || 'landmark');
  }

  function buildDivIcon(stop) {
    var iconKey = stop.categoryIconKey || 'landmark';
    var svg = (window.__ICONS__ && window.__ICONS__.svg(iconKey, 'currentColor', 20)) || '';
    var html = '<div class="marker-pin ' + categoryColorClass(stop) + '">' + svg + '</div>';
    return L.divIcon({
      html: html,
      className: 'marker-pin-wrap',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  function tooltipText(stop) {
    if (stop.nameKr && stop.nameCn) return stop.nameKr + ' · ' + stop.nameCn;
    return stop.nameKr || stop.nameCn || stop.slug;
  }

  function refreshMarkers() {
    if (!MAP) return;
    var state = window.__BETA1_STATE__.get();
    if (!state) return;

    MARKERS.forEach(function (m) { MAP.removeLayer(m); });
    MARKERS.clear();
    POLYLINES.forEach(function (pl) { MAP.removeLayer(pl); });
    POLYLINES.clear();

    var dayFilter = state.activeFilter.day;
    var catFilter = state.activeFilter.category;
    var queryFilter = state.activeFilter.query;
    var matchedSlugs = queryFilter && window.__SEARCH__
      ? new Set(window.__SEARCH__.search(queryFilter))
      : null;

    var dayBuckets = { 1: [], 2: [], 3: [] };

    state.stops.forEach(function (s) {
      // Day filter: stops with day=null are treated as "common" and always visible (D-9 will populate days)
      if (dayFilter !== null && dayFilter !== 'all' && s.day !== null && s.day !== dayFilter) return;
      if (catFilter && s.category !== catFilter) return;
      if (matchedSlugs && !matchedSlugs.has(s.slug)) return;

      var marker = L.marker([s.lat, s.lng], { icon: buildDivIcon(s), title: tooltipText(s) });
      marker.bindTooltip(tooltipText(s), { direction: 'top', offset: [0, -16], className: 'marker-label' });
      marker.on('click', function () {
        if (window.__UI__) window.__UI__.openCard(s.slug);
      });
      marker.addTo(MAP);
      MARKERS.set(s.slug, marker);

      if (s.day && dayBuckets[s.day]) dayBuckets[s.day].push([s.lat, s.lng]);
    });

    var DAY_COLORS = { 1: '#5b8ff9', 2: '#5ad8a6', 3: '#f6bd16' };
    Object.keys(dayBuckets).forEach(function (d) {
      if (dayBuckets[d].length < 2) return;
      var pl = L.polyline(dayBuckets[d], { color: DAY_COLORS[d], weight: 3, opacity: 0.7, dashArray: '6 4' });
      pl.addTo(MAP);
      POLYLINES.set(d, pl);
    });
  }

  function flyToStop(slug) {
    var state = window.__BETA1_STATE__.get();
    var s = state && state.stopsBySlug.get(slug);
    if (!s || !MAP) return;
    MAP.flyTo([s.lat, s.lng], Math.max(MAP.getZoom(), 16), { duration: 0.6 });
  }

  function requestGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      function (pos) {
        // Convert WGS84 device GPS → GCJ-02 only if we wanted to display on Gaode coords;
        // since markers are in WGS84 (post coords-fix), display device GPS as-is.
        var ll = [pos.coords.latitude, pos.coords.longitude];
        if (window.__USER_MARKER__) MAP.removeLayer(window.__USER_MARKER__);
        window.__USER_MARKER__ = L.circleMarker(ll, {
          radius: 8, color: '#1f6feb', fillColor: '#1f6feb', fillOpacity: 0.6, weight: 2
        }).addTo(MAP);
      },
      function (err) {
        // Permission denied / unavailable → silently fall back to hotel center (already initial)
        console.info('[map.js] geolocation unavailable, hotel fallback:', err && err.message);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  window.__MAP__ = {
    init: init,
    refreshMarkers: refreshMarkers,
    flyToStop: flyToStop,
    getMap: function () { return MAP; }
  };
})();
