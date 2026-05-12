/* coords-fix.js — GCJ-02 <-> WGS-84 conversion (China-only offset)
 *
 * Adapted from eviltransform (MIT License)
 *   https://github.com/googollee/eviltransform
 *   Algorithm based on Krasovsky 1940 ellipsoid; the GCJ-02 offset is a
 *   public-domain transformation, but attribution is provided per
 *   eviltransform upstream's MIT license.
 *
 * Pure functions only — no global mutation, no side effects.
 * Exposed as: window.__COORDS__ = { gcj02ToWgs84, wgs84ToGcj02, outOfChina }
 */
(function () {
  'use strict';

  var PI = Math.PI;
  var A = 6378245.0;            // Krasovsky 1940 semi-major
  var EE = 0.00669342162296594; // first eccentricity squared

  function outOfChina(lng, lat) {
    if (lng < 72.004 || lng > 137.8347) return true;
    if (lat < 0.8293 || lat > 55.8271) return true;
    return false;
  }

  function transformLat(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  function delta(lng, lat) {
    var dLat = transformLat(lng - 105.0, lat - 35.0);
    var dLng = transformLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * PI;
    var magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return { dLat: dLat, dLng: dLng };
  }

  // Convert GCJ-02 (Gaode/Baidu input) -> WGS-84 (Leaflet expects)
  function gcj02ToWgs84(lng, lat) {
    if (outOfChina(lng, lat)) return { lng: lng, lat: lat };
    var d = delta(lng, lat);
    return { lng: lng - d.dLng, lat: lat - d.dLat };
  }

  // Convert WGS-84 -> GCJ-02 (e.g. for displaying device GPS on Gaode tiles)
  function wgs84ToGcj02(lng, lat) {
    if (outOfChina(lng, lat)) return { lng: lng, lat: lat };
    var d = delta(lng, lat);
    return { lng: lng + d.dLng, lat: lat + d.dLat };
  }

  window.__COORDS__ = {
    gcj02ToWgs84: gcj02ToWgs84,
    wgs84ToGcj02: wgs84ToGcj02,
    outOfChina: outOfChina
  };
})();
