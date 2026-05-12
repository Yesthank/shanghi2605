/* app.js — entry sequencing + deeplink + QR + prefetch modal trigger
 *
 * Order (DOMContentLoaded):
 *   initState() → initMap() → refreshMarkers() → search.rebuildHaystack
 *   → ui.attachHandlers() → parseDeepLink() → registerSW() → maybeShowPrefetchModal()
 *
 * Race conditions prevented by strict synchronous ordering. SW register is
 * deferred to window 'load' event so it does not block TTI.
 */
(function () {
  'use strict';

  var APP = {};

  function initState() {
    var data = window.__DATA__;
    if (!data || !data.STOPS) throw new Error('app.js: window.__DATA__.STOPS missing');
    var coords = window.__COORDS__;
    if (!coords) throw new Error('app.js: window.__COORDS__ missing');

    // Derive WGS-84 stops (immutable, raw GCJ-02 preserved as latRaw/lngRaw)
    var wgsStops = data.STOPS.map(function (s) {
      var w = coords.gcj02ToWgs84(s.lng, s.lat);
      var copy = {};
      Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
      copy.latRaw = s.lat;
      copy.lngRaw = s.lng;
      copy.lat = w.lat;
      copy.lng = w.lng;
      return copy;
    });

    window.__BETA1_STATE__.init(wgsStops);
  }

  function parseDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('stop');
    if (!slug) return;
    var state = window.__BETA1_STATE__.get();
    if (!state.stopsBySlug.has(slug)) return;
    if (window.__MAP__) window.__MAP__.flyToStop(slug);
    if (window.__UI__)  window.__UI__.openCard(slug);
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol === 'file:') return; // Tertiary fallback: SW unsupported on file://
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function (err) {
        console.warn('[app.js] SW registration failed:', err);
      });
    });
  }

  function maybeShowPrefetchModal() {
    // Hybrid (ADR-004): show modal on first PWA entry only
    var dismissed = localStorage.getItem('modalDismissedAt');
    var prefetched = localStorage.getItem('tilePrefetchedAt');
    if (prefetched || dismissed) return;
    if (window.__UI__ && window.__UI__.showPrefetchModal) {
      window.__UI__.showPrefetchModal();
    }
  }

  function shareCurrentStop() {
    var state = window.__BETA1_STATE__.get();
    var slug = state.selectedSlug;
    if (!slug) return;
    var url = window.location.origin + window.location.pathname + '?stop=' + slug;
    if (window.__UI__ && window.__UI__.showQrModal) window.__UI__.showQrModal(url);
  }

  function start() {
    try {
      initState();
      if (window.__MAP__) window.__MAP__.init();
      if (window.__MAP__) window.__MAP__.refreshMarkers();
      if (window.__SEARCH__) {
        var st = window.__BETA1_STATE__.get();
        window.__SEARCH__.rebuildHaystack(st.stops);
      }
      if (window.__UI__) window.__UI__.attachHandlers();
      parseDeepLink();
      registerSW();
      maybeShowPrefetchModal();
    } catch (err) {
      console.error('[app.js] startup error:', err);
      var banner = document.querySelector('.degradation-banner');
      if (banner) {
        banner.textContent = '초기화 오류 — 콘솔 확인: ' + err.message;
        banner.className = 'degradation-banner offline';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  APP.shareCurrentStop = shareCurrentStop;
  window.__APP__ = APP;
})();
