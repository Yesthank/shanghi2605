/* state.js — single immutable state store (Beta1 ADR-007)
 *
 * Writer permission matrix:
 *   setStops:           app.js (initState only, once)
 *   setSelected:        ui.js (selectStop)
 *   setFilter:          ui.js (toggleListView, setDayFilter, setCategoryFilter, setQuery)
 *   setDegradationMode: any module via window event 'degradation' or direct call
 *   setCacheStatus:     sw.js (BroadcastChannel listener only)
 *   Tertiary mode:      N/A (sw.js / Geolocation / prefetch all absent)
 *
 * Codex peer-review fix: leaf objects are deep-frozen (Object.freeze is shallow).
 * Every mutation re-freezes the new container + every leaf stop.
 * `stops_changed` CustomEvent fires on every setStops call (search.js listens).
 */
(function () {
  'use strict';

  var STATE = null;

  function deepFreezeStop(stop) {
    if (stop && typeof stop === 'object' && !Object.isFrozen(stop)) {
      Object.values(stop).forEach(function (v) {
        if (v && typeof v === 'object') Object.freeze(v);
      });
      Object.freeze(stop);
    }
    return stop;
  }

  function freezeState(next) {
    if (next.stops) next.stops.forEach(deepFreezeStop);
    if (next.activeFilter) Object.freeze(next.activeFilter);
    if (next.prefetchProgress) Object.freeze(next.prefetchProgress);
    return Object.freeze(next);
  }

  function init(stops) {
    if (STATE) throw new Error('state.js: setStops called twice — writer matrix violation');
    var bySlug = new Map();
    stops.forEach(function (s) { bySlug.set(s.slug, s); });
    STATE = freezeState({
      stops: stops,
      stopsBySlug: bySlug,
      activeFilter: { day: null, category: null, query: '' },
      selectedSlug: null,
      degradationMode: 'normal',
      cacheReady: false,
      prefetchProgress: null
    });
    window.dispatchEvent(new CustomEvent('stops_changed', { detail: { newStops: stops } }));
    return STATE;
  }

  function update(patch) {
    if (!STATE) throw new Error('state.js: update called before init');
    var next = {};
    Object.keys(STATE).forEach(function (k) { next[k] = STATE[k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    STATE = freezeState(next);
    return STATE;
  }

  function get() { return STATE; }

  function setSelected(slug) {
    return update({ selectedSlug: slug });
  }

  function setFilter(filterPatch) {
    var nextFilter = {};
    Object.keys(STATE.activeFilter).forEach(function (k) { nextFilter[k] = STATE.activeFilter[k]; });
    Object.keys(filterPatch).forEach(function (k) { nextFilter[k] = filterPatch[k]; });
    return update({ activeFilter: nextFilter });
  }

  var VALID_MODES = ['normal', 'offline', 'portal_blocked', 'low_battery'];
  function setDegradationMode(mode) {
    if (VALID_MODES.indexOf(mode) === -1) throw new Error('state.js: invalid degradation mode ' + mode);
    return update({ degradationMode: mode });
  }

  function setCacheStatus(status) {
    return update({
      cacheReady: !!status.ready,
      prefetchProgress: status.progress || null
    });
  }

  // Helper: empty-field UI rule. Used by ui.js to hide null/empty fields.
  function shouldDisplayField(stop, fieldName) {
    var v = stop[fieldName];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.length === 0) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }

  window.__BETA1_STATE__ = {
    init: init,
    get: get,
    setSelected: setSelected,
    setFilter: setFilter,
    setDegradationMode: setDegradationMode,
    setCacheStatus: setCacheStatus,
    shouldDisplayField: shouldDisplayField,
    VALID_MODES: VALID_MODES
  };
})();
