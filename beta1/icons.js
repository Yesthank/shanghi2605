/* icons.js — 10 inline SVG paths (P3 cut: 15 → 10)
 *
 * Attribution:
 *   Lucide icons     ISC License  https://lucide.dev/
 *   Maki icons       CC0          https://labs.mapbox.com/maki-icons/
 *
 * Each entry: 24x24 viewBox path string (Lucide stroke-style).
 * Used by map.js for divIcon markers and ui.js for category badges.
 */
(function () {
  'use strict';

  var ICONS = {
    // 8 category icons (matches state.js category palette)
    'bed':           'M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3M2 11v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM4 18h16',
    'landmark':      'M3 22h18M5 22V11l7-7 7 7v11M9 22V14h6v8',
    'utensils':      'M3 2v7c0 1.1.9 2 2 2h2v11M7 2v20M21 15V2v6a3 3 0 0 1-3 3v11',
    'coffee':        'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
    'museum':        'M2 22h20M3 22V10l9-7 9 7v12M7 22V14M12 22V14M17 22V14',
    'shopping-bag':  'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    'train':         'M4 11a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6zM7 14h10M8 20l-2 2M16 20l2 2M9 17h.01M15 17h.01',
    'waves':         'M2 6c.6.5 1.2 1 2.5 1S6.4 6.5 7 6s1.2-1 2.5-1 1.9.5 2.5 1 1.2 1 2.5 1 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1 1.2-1 2.5-1 1.9.5 2.5 1 1.2 1 2.5 1 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1 1.2-1 2.5-1 1.9.5 2.5 1 1.2 1 2.5 1 1.9-.5 2.5-1',
    // 2 utility icons used outside category palette
    'map-pin':       'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'qr-code':       'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z'
  };

  function svg(key, color, size) {
    var path = ICONS[key];
    if (!path) return '';
    var s = size || 24;
    var c = color || 'currentColor';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }

  window.__ICONS__ = {
    paths: ICONS,
    svg: svg,
    keys: Object.keys(ICONS)
  };
})();
