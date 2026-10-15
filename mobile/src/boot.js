/* ParkSmart Mobile — starts the on-phone engine (same server.js as the laptop). */
(function () {
  'use strict';
  var tag;
  try { tag = localStorage.getItem('parksmart_device_tag'); } catch (e) { tag = null; }
  if (!tag || !/^[A-Z]{2}$/.test(tag)) {
    var L = 'ABCDEFGHJKLMNPRSTUVWXYZ'; tag = L[Math.floor(Math.random() * L.length)] + L[Math.floor(Math.random() * L.length)];
    try { localStorage.setItem('parksmart_device_tag', tag); } catch (e) {}
  }
  var PREFIX = 'M' + tag;
  var build = PS_require('./server');
  var app = build({ idPrefix: PREFIX, tickMs: 4000 });

  // phone-only routes: sync file, storage info, reset demo data
  function phoneReports() { return app.db.violations.filter(function (v) { return v.id.indexOf('M') === 0 && v.id.length === PREFIX.length + 5 && v.id.indexOf(PREFIX) === 0; }); }
  app.route('GET', '/api/mobile/info', function () {
    var used = 0; try { used = (localStorage.getItem('parksmart_mobile_db_v1') || '').length; } catch (e) {}
    var mine = phoneReports();
    return { device: PREFIX, reports: mine.length, withPhoto: mine.filter(function (v) { return v.photo; }).length, storageKB: Math.round(used / 1024) };
  }, { public: true });
  app.route('GET', '/api/mobile/sync', function () {
    var mine = phoneReports();
    var out = { type: 'parksmart-sync', version: 1, device: PREFIX, exportedAt: new Date().toISOString(), violations: mine };
    var d = new Date(), stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2);
    return { __raw: true, type: 'application/json', headers: { 'Content-Disposition': 'attachment; filename="parksmart-sync-' + PREFIX + '-' + stamp + '.json"' }, body: JSON.stringify(out) };
  }, { public: true });
  app.route('POST', '/api/mobile/reset', function () { app.reset(); setTimeout(function () { location.reload(); }, 100); return { ok: true }; }, { public: true });

  app.start();
  window.PS_LOCAL = { flush: app.flush, prefix: PREFIX };
})();
