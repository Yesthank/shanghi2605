/* search.js — substring search over precomputed haystack
 *
 * Listens to window 'stops_changed' event (fired by state.js) for lazy reload.
 * Exposed as: window.__SEARCH__ = { rebuildHaystack, search }
 */
(function () {
  'use strict';

  // slug -> haystack string (lowercased concat of nameKr + nameCn + slug + categoryIconKey + desc)
  var HAYSTACK = new Map();

  function rebuildHaystack(stops) {
    HAYSTACK.clear();
    stops.forEach(function (s) {
      var parts = [
        s.slug || '',
        s.nameKr || '',
        s.nameCn || '',
        s.categoryIconKey || '',
        s.desc || ''
      ];
      HAYSTACK.set(s.slug, parts.join(' ').toLowerCase());
    });
  }

  function search(query) {
    if (!query || !query.trim()) return [];
    var q = query.trim().toLowerCase();
    var hits = [];
    HAYSTACK.forEach(function (hay, slug) {
      if (hay.indexOf(q) !== -1) hits.push(slug);
    });
    return hits;
  }

  // Lazy reload when state.js setStops fires `stops_changed`
  window.addEventListener('stops_changed', function (e) {
    if (e.detail && e.detail.newStops) rebuildHaystack(e.detail.newStops);
  });

  window.__SEARCH__ = {
    rebuildHaystack: rebuildHaystack,
    search: search,
    size: function () { return HAYSTACK.size; }
  };
})();
