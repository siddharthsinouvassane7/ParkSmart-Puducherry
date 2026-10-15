// ParkSmart Puducherry — Smart Parking, Traffic Enforcement & Citizen Reporting (PS-03)
// Puducherry Police Hackathon 2026 prototype. Zero dependencies: run `node server/server.js`.
'use strict';
const path = require('path');
const core = require('./core');
const { seed, PROFILES, VTYPES } = require('./seed');

const BBOX = { minLat: 11.75, maxLat: 12.10, minLng: 79.65, maxLng: 79.95 };
const OPEN_STATUSES = ['New', 'Verified'];
const CLOSED = ['Challan issued', 'Warned', 'Rejected', 'Duplicate', 'Towed'];

function hav(a, b, c, d) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (c - a) * toR, dLng = (d - b) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// distance from point to polyline (metres, local flat approximation)
function distToPath(lat, lng, pathArr) {
  let best = Infinity;
  const kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const ax = (pathArr[i][1] - lng) * kx, ay = (pathArr[i][0] - lat) * ky;
    const bx = (pathArr[i + 1][1] - lng) * kx, by = (pathArr[i + 1][0] - lat) * ky;
    const dx = bx - ax, dy = by - ay;
    let t = -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    best = Math.min(best, Math.sqrt(px * px + py * py));
  }
  return best;
}
function dowFactor(profile, d) {
  const wk = d.getDay() === 0 || d.getDay() === 6;
  if (!wk) return 1;
  return { beach: 1.15, temple: 1.12, market: 1.05, transit: 1.0, office: 0.45, hospital: 0.9 }[profile] || 1;
}
function expectedPct(lot, d) {
  const p = PROFILES[lot.profile] || PROFILES.market;
  const h = d.getHours(), m = d.getMinutes() / 60;
  const v = p[h] + (p[(h + 1) % 24] - p[h]) * m;
  return Math.min(1, v * dowFactor(lot.profile, d));
}

function build(opts) {
  opts = opts || {};
  const app = core.createApp({
    root: path.join(__dirname, '..'), dataDir: opts.dataDir, port: opts.port || 5053, maxPort: 5060,
    title: 'ParkSmart Puducherry (PS-03)', cookie: 'ps03sid', seed: seed,
    appInfo: { name: 'ParkSmart Puducherry', ps: 'PS-03' },
    onLoad: function (db) {
      // Demo mode: roll all dates forward so the data always looks current.
      if (db.demo && db.anchor) {
        const shift = Date.now() - db.anchor;
        if (shift > 60000) {
          const mv = function (s) { return s ? new Date(new Date(s).getTime() + shift).toISOString() : s; };
          db.violations.forEach(function (v) { v.ts = mv(v.ts); (v.history || []).forEach(function (h) { h.at = mv(h.at); }); });
          db.anchor = Date.now();
        }
      }
    },
    tickMs: opts.tickMs || 4000,
    tick: function (a) {
      const db = a.db;
      if (!db.sim) return;
      const now = new Date();
      const upd = [];
      db.lots.forEach(function (l) {
        if (l.status !== 'open') return;
        const target = expectedPct(l, now);
        ['car', 'bike'].forEach(function (k) {
          const cap = l.cap[k];
          const tgt = cap * Math.min(1, target * (k === 'bike' ? 0.95 : 1) + (Math.random() - 0.5) * 0.06);
          let o = l.occ[k] + (tgt - l.occ[k]) * 0.12 + (Math.random() - 0.5) * Math.max(2, cap * 0.02);
          l.occ[k] = Math.max(0, Math.min(cap, Math.round(o)));
        });
        upd.push({ id: l.id, car: l.occ.car, bike: l.occ.bike });
      });
      a.broadcast('occ', upd);
      a.save();
    }
  });
  const db = function () { return app.db; };
  const vtype = function (t) { return VTYPES.find(function (x) { return x.type === t; }); };

  function lotView(l, now) {
    now = now || new Date();
    const pct = l.cap.car ? l.occ.car / l.cap.car : 0;
    const bpct = l.cap.bike ? l.occ.bike / l.cap.bike : 0;
    const exp = expectedPct(l, now), expNext = expectedPct(l, new Date(now.getTime() + 3600000));
    const nextPct = Math.max(0, Math.min(1, pct + (expNext - exp)));
    return Object.assign({}, l, {
      free: { car: l.cap.car - l.occ.car, bike: l.cap.bike - l.occ.bike },
      pct: +pct.toFixed(3), bpct: +bpct.toFixed(3), nextPct: +nextPct.toFixed(3),
      level: l.status !== 'open' ? 'closed' : pct >= 0.9 ? 'full' : pct >= 0.7 ? 'busy' : 'free'
    });
  }
  function placeFor(lat, lng) {
    let best = null;
    db().noPark.forEach(function (z) { const d = distToPath(lat, lng, z.path); if (d < 120 && (!best || d < best.d)) best = { d: d, place: z.name, zone: z.zone }; });
    if (best) return best;
    db().lots.forEach(function (l) { const d = hav(lat, lng, l.lat, l.lng); if (d < 500 && (!best || d < best.d)) best = { d: d, place: 'Near ' + l.name, zone: l.zone }; });
    return best || { place: 'Near ' + lat.toFixed(4) + ', ' + lng.toFixed(4), zone: 'Other' };
  }
  function normPlate(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
  function priority(v) {
    const t = vtype(v.type);
    const h = new Date(v.ts).getHours();
    const peak = (h >= 9 && h <= 12) || (h >= 17 && h <= 21);
    if (v.place === 'Hospital Road (Victor Simonel St)') return 'High';
    if (t && t.blocking && (peak || v.zone === 'Transit Hub')) return 'High';
    if (t && t.blocking) return 'Medium';
    return peak ? 'Medium' : 'Normal';
  }
  function findDuplicate(v) {
    const t = new Date(v.ts).getTime();
    return db().violations.find(function (o) {
      if (o.id === v.id || CLOSED.indexOf(o.status) >= 0 && o.status !== 'Challan issued') return false;
      if (Math.abs(new Date(o.ts).getTime() - t) > 30 * 60000) return false;
      const near = hav(o.lat, o.lng, v.lat, v.lng) < 60;
      return (v.plate && o.plate === v.plate && hav(o.lat, o.lng, v.lat, v.lng) < 200) || (near && o.type === v.type && (!v.plate || !o.plate));
    });
  }
  function createViolation(b, source, by, ctx) {
    const lat = +b.lat, lng = +b.lng;
    if (!(lat > BBOX.minLat && lat < BBOX.maxLat && lng > BBOX.minLng && lng < BBOX.maxLng)) throw app.httpError(400, 'Pick the location on the map (inside Puducherry).');
    if (!vtype(b.type)) throw app.httpError(400, 'Choose the violation type.');
    const pl = normPlate(b.plate);
    if (pl && !/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(pl)) throw app.httpError(400, 'Vehicle number looks wrong. Example: PY01AB1234');
    const where = placeFor(lat, lng);
    const d = db();
    const v = {
      id: (opts.idPrefix || 'V') + String(d.seq++).padStart(5, '0'), ts: new Date().toISOString(), source: source, type: b.type, plate: pl || '', vehicle: b.vehicle || 'Car',
      lat: +lat.toFixed(6), lng: +lng.toFixed(6), place: where.place, zone: where.zone, unit: d.zoneUnit[where.zone] || 'Traffic East',
      desc: String(b.desc || '').slice(0, 500), photo: null, cameraId: b.cameraId || null, status: 'New', fine: 0,
      history: [{ at: new Date().toISOString(), by: by, action: 'Reported' + (source === 'camera' ? ' (auto-detected, dwell ' + (b.dwell || '?') + ')' : '') }]
    };
    if (pl && b.plateOcr != null && b.plateOcr !== '' && isFinite(+b.plateOcr)) v.plateOcr = Math.max(0, Math.min(100, Math.round(+b.plateOcr)));
    if (b.photo) { const f = app.saveDataUrl(b.photo, v.id); v.photo = f.url; v.photoHash = f.sha256; }
    v.priority = priority(v);
    const dup = findDuplicate(v);
    if (dup) { v.dupOf = dup.id; v.history.push({ at: v.ts, by: 'System', action: 'Possible duplicate of ' + dup.id }); }
    d.violations.unshift(v);
    app.save();
    app.broadcast('viol', { id: v.id, type: v.type, place: v.place, source: v.source, priority: v.priority, lat: v.lat, lng: v.lng, status: v.status, ts: v.ts });
    return v;
  }

  // ---------------- public: parking ----------------
  app.route('GET', '/api/lots', function () { const now = new Date(); return db().lots.map(function (l) { return lotView(l, now); }); }, { public: true });
  app.route('GET', '/api/lots/:id/forecast', function (ctx) {
    const l = db().lots.find(function (x) { return x.id === ctx.params.id; });
    if (!l) throw ctx.error(404, 'Lot not found');
    const today = new Date(); today.setMinutes(0, 0, 0);
    const hours = [];
    for (let h = 0; h < 24; h++) { const d = new Date(today); d.setHours(h); hours.push(Math.round(expectedPct(l, d) * 100)); }
    // best time = lowest expected occupancy between now and 22:00
    const nowH = new Date().getHours();
    let best = null;
    for (let h = nowH; h <= 22; h++) if (best === null || hours[h] < hours[best]) best = h;
    return { id: l.id, hours: hours, nowHour: nowH, best: best };
  }, { public: true });
  app.route('GET', '/api/meta', function () {
    const d = db();
    return { noPark: d.noPark, landmarks: d.landmarks, vtypes: d.vtypes, units: d.units, sim: d.sim };
  }, { public: true });

  // ---------------- public: citizen reporting ----------------
  const recent = new Map();
  app.route('POST', '/api/report', function (ctx) {
    const ip = ctx.req.socket.remoteAddress || 'x';
    const list = (recent.get(ip) || []).filter(function (t) { return t > Date.now() - 600000; });
    if (list.length >= 10) throw ctx.error(429, 'Too many reports from this device. Try again in a few minutes.');
    list.push(Date.now()); recent.set(ip, list);
    const v = createViolation(ctx.body, 'citizen', 'Citizen', ctx);
    if (ctx.body.contact) v.contact = String(ctx.body.contact).replace(/[^0-9+]/g, '').slice(0, 13);
    app.audit(null, 'citizen-report', v.id + ' ' + v.type + ' @ ' + v.place);
    return { id: v.id, priority: v.priority, place: v.place, dupOf: v.dupOf || null };
  }, { public: true, limit: 6 * 1024 * 1024 });
  app.route('GET', '/api/track/:id', function (ctx) {
    const id = String(ctx.params.id).toUpperCase().trim();
    const v = db().violations.find(function (x) { return x.id === id; });
    if (!v) throw ctx.error(404, 'No report with ID ' + id);
    return { id: v.id, ts: v.ts, type: v.type, place: v.place, status: v.status, plate: v.plate ? v.plate.slice(0, 4) + '••' + v.plate.slice(-2) : '', history: v.history.map(function (h) { return { at: h.at, action: h.action, remarks: h.remarks || '' }; }) };
  }, { public: true });

  // ---------------- police: violations ----------------
  const POLICE = ['admin', 'officer'];
  app.route('GET', '/api/violations', function (ctx) {
    const q = ctx.query; const days = +q.days || 7; const since = Date.now() - days * 86400000;
    let list = db().violations.filter(function (v) { return new Date(v.ts).getTime() >= since; });
    if (q.status === 'open') list = list.filter(function (v) { return OPEN_STATUSES.indexOf(v.status) >= 0; });
    else if (q.status) list = list.filter(function (v) { return v.status === q.status; });
    if (q.type) list = list.filter(function (v) { return v.type === q.type; });
    if (q.source) list = list.filter(function (v) { return v.source === q.source; });
    if (q.zone) list = list.filter(function (v) { return v.zone === q.zone; });
    if (q.q) { const s = q.q.toUpperCase(); list = list.filter(function (v) { return v.id.indexOf(s) >= 0 || (v.plate || '').indexOf(s.replace(/\s/g, '')) >= 0 || v.place.toUpperCase().indexOf(s) >= 0; }); }
    const total = list.length;
    return { total: total, items: list.slice(0, +q.limit || 300).map(function (v) { return Object.assign({ priority: v.priority || priority(v) }, v); }) };
  }, { roles: POLICE });
  app.route('GET', '/api/violations/:id', function (ctx) {
    const v = db().violations.find(function (x) { return x.id === ctx.params.id; });
    if (!v) throw ctx.error(404, 'Not found');
    const prior = v.plate ? db().violations.filter(function (o) { return o.plate === v.plate && o.id !== v.id; }).map(function (o) { return { id: o.id, ts: o.ts, type: o.type, place: o.place, status: o.status, fine: o.fine, paid: o.paid }; }) : [];
    return Object.assign({ priority: v.priority || priority(v), prior: prior, fineDefault: (vtype(v.type) || {}).fine || 500 }, v);
  }, { roles: POLICE });
  app.route('POST', '/api/violations', function (ctx) {
    const src = ctx.body.source === 'camera' ? 'camera' : 'officer';
    const v = createViolation(ctx.body, src, src === 'camera' ? 'CCTV auto-detect (' + (ctx.body.cameraId || 'CAM') + ')' : ctx.user.name, ctx);
    ctx.audit('violation-create', v.id + ' ' + src);
    return v;
  }, { roles: POLICE, limit: 6 * 1024 * 1024 });
  app.route('POST', '/api/violations/:id/action', function (ctx) {
    const v = db().violations.find(function (x) { return x.id === ctx.params.id; });
    if (!v) throw ctx.error(404, 'Not found');
    const a = ctx.body.action, rem = String(ctx.body.remarks || '').slice(0, 300);
    const t = vtype(v.type) || { fine: 500 };
    const now = new Date().toISOString();
    const isOpen = OPEN_STATUSES.indexOf(v.status) >= 0;
    if (a === 'verify') { if (v.status !== 'New') throw ctx.error(400, 'Only new reports can be verified'); v.status = 'Verified'; v.respMin = Math.round((Date.now() - new Date(v.ts).getTime()) / 60000); }
    else if (a === 'challan' || a === 'tow') {
      if (!isOpen) throw ctx.error(400, 'Report is already closed');
      if (!v.plate && !ctx.body.plate) throw ctx.error(400, 'Enter the vehicle number before issuing a challan');
      if (ctx.body.plate) { const p = normPlate(ctx.body.plate); if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(p)) throw ctx.error(400, 'Vehicle number looks wrong'); v.plate = p; }
      v.fine = Math.max(0, +ctx.body.fine || t.fine) + (a === 'tow' ? 500 : 0);
      v.status = a === 'tow' ? 'Towed' : 'Challan issued'; v.paid = false; v.challanNo = 'PYT/' + new Date().getFullYear() + '/' + v.id.slice(1);
      if (v.respMin == null) v.respMin = Math.round((Date.now() - new Date(v.ts).getTime()) / 60000);
    }
    else if (a === 'warn') { if (!isOpen) throw ctx.error(400, 'Report is already closed'); v.status = 'Warned'; }
    else if (a === 'reject') { if (!isOpen) throw ctx.error(400, 'Report is already closed'); if (!rem) throw ctx.error(400, 'Give a reason for rejecting'); v.status = 'Rejected'; }
    else if (a === 'duplicate') { if (!isOpen) throw ctx.error(400, 'Report is already closed'); v.status = 'Duplicate'; }
    else if (a === 'paid') { if (!v.fine) throw ctx.error(400, 'No fine on this report'); v.paid = true; }
    else throw ctx.error(400, 'Unknown action');
    const label = { verify: 'Verified on spot', challan: 'Challan issued (₹' + v.fine + ')', tow: 'Vehicle towed (₹' + v.fine + ')', warn: 'Warned', reject: 'Rejected', duplicate: 'Marked duplicate', paid: 'Fine paid' }[a];
    v.history.push({ at: now, by: ctx.user.name, action: label, remarks: rem });
    v.updatedAt = now;
    app.save();
    ctx.audit('violation-' + a, v.id);
    app.broadcast('viol', { id: v.id, status: v.status, type: v.type, place: v.place, lat: v.lat, lng: v.lng, ts: v.ts, update: true });
    return v;
  }, { roles: POLICE });

  // ---------------- parking lot operations ----------------
  app.route('POST', '/api/lots/:id/count', function (ctx) {
    const l = db().lots.find(function (x) { return x.id === ctx.params.id; });
    if (!l) throw ctx.error(404, 'Lot not found');
    if (ctx.user.role === 'attendant' && ctx.user.lotId !== l.id) throw ctx.error(403, 'You can only update your own parking lot');
    const k = ctx.body.kind === 'bike' ? 'bike' : 'car', dlt = (+ctx.body.delta || 0) > 0 ? 1 : -1;
    l.occ[k] = Math.max(0, Math.min(l.cap[k], l.occ[k] + dlt));
    app.save();
    app.broadcast('occ', [{ id: l.id, car: l.occ.car, bike: l.occ.bike }]);
    return lotView(l);
  }, { roles: ['admin', 'officer', 'attendant'] });
  app.route('PUT', '/api/lots/:id', function (ctx) {
    const l = db().lots.find(function (x) { return x.id === ctx.params.id; });
    if (!l) throw ctx.error(404, 'Lot not found');
    const b = ctx.body;
    if (b.status && ['open', 'closed'].indexOf(b.status) >= 0) l.status = b.status;
    ['car', 'bike'].forEach(function (k) {
      if (b.cap && b.cap[k] != null) { const c = Math.max(0, Math.min(2000, Math.round(+b.cap[k]))); if (!isNaN(c)) { l.cap[k] = c; l.occ[k] = Math.min(l.occ[k], c); } }
      if (b.rate && b.rate[k] != null && !isNaN(+b.rate[k])) l.rate[k] = Math.max(0, Math.round(+b.rate[k]));
    });
    app.save(); ctx.audit('lot-update', l.id + ' ' + JSON.stringify(b));
    return lotView(l);
  }, { roles: ['admin'] });
  app.route('POST', '/api/sim', function (ctx) { db().sim = !!ctx.body.on; app.save(); ctx.audit('simulation', db().sim ? 'on' : 'off'); return { sim: db().sim }; }, { roles: ['admin'] });

  // ---------------- dashboard & analytics ----------------
  function zoneStats(now) {
    const d = db(); const zones = {};
    d.lots.forEach(function (l) {
      const z = zones[l.zone] = zones[l.zone] || { zone: l.zone, cap: 0, occ: 0, lots: 0, active: 0 };
      if (l.status === 'open') { z.cap += l.cap.car; z.occ += l.occ.car; } z.lots++;
    });
    const since = now - 2 * 3600000;
    d.violations.forEach(function (v) { if (new Date(v.ts).getTime() >= since && zones[v.zone]) zones[v.zone].active++; });
    return Object.values(zones).map(function (z) {
      z.pct = z.cap ? z.occ / z.cap : 0;
      z.index = Math.round(100 * (0.6 * z.pct + 0.4 * Math.min(1, z.active / 6)));
      z.level = z.index >= 75 ? 'Severe' : z.index >= 55 ? 'High' : z.index >= 35 ? 'Moderate' : 'Low';
      return z;
    }).sort(function (a, b) { return b.index - a.index; });
  }
  function recommendations() {
    const d = db(); const now = Date.now(); const since = now - 7 * 86400000;
    const recs = [];
    // hotspot stretches with peak windows
    const byPlace = {};
    d.violations.forEach(function (v) {
      if (new Date(v.ts).getTime() < since) return;
      const p = byPlace[v.place] = byPlace[v.place] || { place: v.place, zone: v.zone, n: 0, hours: new Array(24).fill(0), lat: v.lat, lng: v.lng };
      p.n++; p.hours[new Date(v.ts).getHours()]++;
    });
    const spots = Object.values(byPlace).sort(function (a, b) { return b.n - a.n; }).slice(0, 4);
    spots.forEach(function (s, i) {
      let bh = 0, bv = -1; for (let h = 0; h < 22; h++) { const w = s.hours[h] + s.hours[h + 1] + s.hours[h + 2]; if (w > bv) { bv = w; bh = h; } }
      // nearest lot with free space at that hour
      let alt = null;
      d.lots.forEach(function (l) { const dist = hav(s.lat, s.lng, l.lat, l.lng); const t = new Date(); t.setHours(bh + 1); const e = expectedPct(l, t); if (dist < 900 && e < 0.8 && (!alt || dist < alt.dist)) alt = { name: l.name, dist: Math.round(dist), pct: Math.round(e * 100) }; });
      recs.push({
        kind: i === 0 ? 'tow' : 'patrol', priority: i < 2 ? 'High' : 'Medium',
        title: (i === 0 ? 'Deploy tow vehicle' : 'Patrol focus') + ' — ' + s.place,
        text: s.n + ' violations in last 7 days; peak ' + String(bh).padStart(2, '0') + ':00–' + String(bh + 3).padStart(2, '0') + ':00 (' + bv + ' reports).' +
          (alt ? ' Direct drivers to ' + alt.name + ' (' + alt.dist + ' m away, usually ' + alt.pct + '% full then).' : ' No nearby lot has spare capacity at that time — consider temporary parking.')
      });
    });
    // supply-demand gaps
    zoneStats(now).forEach(function (z) {
      if (z.pct >= 0.88) recs.push({ kind: 'capacity', priority: 'High', title: 'Parking demand exceeds supply — ' + z.zone, text: 'Lots in ' + z.zone + ' are ' + Math.round(z.pct * 100) + '% full right now. Open overflow parking or push Park & Ride (Rajiv Gandhi Square shuttle) on display boards.' });
    });
    const under = d.lots.filter(function (l) { return l.status === 'open' && l.cap.car && l.occ.car / l.cap.car < 0.45; }).slice(0, 2);
    under.forEach(function (l) { recs.push({ kind: 'signage', priority: 'Normal', title: 'Under-used lot — ' + l.name, text: 'Only ' + Math.round(100 * l.occ.car / l.cap.car) + '% full. Add direction signboards / app listing so drivers stop parking on nearby streets.' }); });
    return recs;
  }
  app.route('GET', '/api/dashboard', function () {
    const d = db(); const now = Date.now();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = d.violations.filter(function (v) { return new Date(v.ts) >= start; });
    const week = d.violations.filter(function (v) { return new Date(v.ts).getTime() >= now - 7 * 86400000; });
    const resp = week.filter(function (v) { return v.respMin != null; }).map(function (v) { return v.respMin; }).sort(function (a, b) { return a - b; });
    const lots = d.lots.map(function (l) { return lotView(l); });
    const hourly = new Array(24).fill(0); today.forEach(function (v) { hourly[new Date(v.ts).getHours()]++; });
    return {
      kpi: {
        freeCar: lots.reduce(function (s, l) { return s + (l.status === 'open' ? l.free.car : 0); }, 0),
        freeBike: lots.reduce(function (s, l) { return s + (l.status === 'open' ? l.free.bike : 0); }, 0),
        capCar: lots.reduce(function (s, l) { return s + l.cap.car; }, 0),
        fullLots: lots.filter(function (l) { return l.level === 'full'; }).length,
        reportsToday: today.length,
        open: d.violations.filter(function (v) { return OPEN_STATUSES.indexOf(v.status) >= 0; }).length,
        challansToday: today.filter(function (v) { return v.status === 'Challan issued' || v.status === 'Towed'; }).length,
        finesToday: today.reduce(function (s, v) { return s + (v.fine || 0); }, 0),
        medianResp: resp.length ? resp[Math.floor(resp.length / 2)] : null,
        citizenShare: week.length ? Math.round(100 * week.filter(function (v) { return v.source === 'citizen'; }).length / week.length) : 0
      },
      zones: zoneStats(now), recs: recommendations(), hourly: hourly,
      recent: d.violations.slice(0, 10).map(function (v) { return { id: v.id, ts: v.ts, type: v.type, place: v.place, status: v.status, source: v.source, priority: v.priority || priority(v) }; }),
      openList: d.violations.filter(function (v) { return OPEN_STATUSES.indexOf(v.status) >= 0; }).slice(0, 60).map(function (v) { return { id: v.id, lat: v.lat, lng: v.lng, type: v.type, place: v.place, status: v.status, priority: v.priority || priority(v), ts: v.ts }; }),
      sim: d.sim
    };
  }, { roles: POLICE });
  app.route('GET', '/api/analytics', function (ctx) {
    const d = db(); const days = Math.min(60, +ctx.query.days || 30); const since = Date.now() - days * 86400000;
    const L = d.violations.filter(function (v) { return new Date(v.ts).getTime() >= since; });
    const cnt = function (f) { const o = {}; L.forEach(function (v) { const k = f(v); o[k] = (o[k] || 0) + 1; }); return o; };
    const matrix = [...Array(7)].map(function () { return new Array(24).fill(0); });
    L.forEach(function (v) { const t = new Date(v.ts); matrix[t.getDay()][t.getHours()]++; });
    const daily = {}; for (let i = days - 1; i >= 0; i--) { const t = new Date(Date.now() - i * 86400000); daily[t.toISOString().slice(0, 10)] = 0; }
    L.forEach(function (v) { const k = new Date(v.ts).toISOString().slice(0, 10); if (k in daily) daily[k]++; });
    const srcAcc = {}; L.forEach(function (v) { if (OPEN_STATUSES.indexOf(v.status) >= 0) return; const s = srcAcc[v.source] = srcAcc[v.source] || { total: 0, valid: 0 }; s.total++; if (v.status !== 'Rejected' && v.status !== 'Duplicate') s.valid++; });
    const unitResp = {}; L.forEach(function (v) { if (v.respMin == null) return; const u = unitResp[v.unit] = unitResp[v.unit] || []; u.push(v.respMin); });
    Object.keys(unitResp).forEach(function (k) { const a = unitResp[k].sort(function (x, y) { return x - y; }); unitResp[k] = { median: a[Math.floor(a.length / 2)], n: a.length }; });
    const places = cnt(function (v) { return v.place; });
    return {
      days: days, total: L.length, byType: cnt(function (v) { return v.type; }), bySource: cnt(function (v) { return v.source; }), byStatus: cnt(function (v) { return v.status; }),
      byZone: cnt(function (v) { return v.zone; }), matrix: matrix, daily: daily, srcAcc: srcAcc, unitResp: unitResp,
      topPlaces: Object.keys(places).map(function (k) { return { place: k, n: places[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10),
      fines: L.reduce(function (s, v) { return s + (v.fine || 0); }, 0), finesPaid: L.reduce(function (s, v) { return s + (v.paid ? v.fine || 0 : 0); }, 0),
      points: L.map(function (v) { return [v.lat, v.lng]; })
    };
  }, { roles: POLICE });
  app.route('GET', '/api/offenders', function () {
    const g = {};
    db().violations.forEach(function (v) {
      if (!v.plate || v.status === 'Rejected' || v.status === 'Duplicate') return;
      const o = g[v.plate] = g[v.plate] || { plate: v.plate, n: 0, last: v.ts, places: {}, types: {}, fines: 0, unpaid: 0, vehicle: v.vehicle };
      o.n++; if (v.ts > o.last) o.last = v.ts; o.places[v.place] = 1; o.types[v.type] = 1; o.fines += v.fine || 0; if (v.fine && !v.paid) o.unpaid += v.fine;
    });
    return Object.values(g).filter(function (o) { return o.n >= 2; }).map(function (o) { o.places = Object.keys(o.places); o.types = Object.keys(o.types); o.habitual = o.n >= 4; return o; }).sort(function (a, b) { return b.n - a.n || b.unpaid - a.unpaid; });
  }, { roles: POLICE });
  // ---------------- phone sync: import reports recorded on ParkSmart Mobile ----------------
  app.route('POST', '/api/import-sync', function (ctx) {
    const data = ctx.body && ctx.body.data;
    if (!data || data.type !== 'parksmart-sync' || !Array.isArray(data.violations)) throw ctx.error(400, 'This is not a ParkSmart phone sync file.');
    const d = db(); const have = new Set(d.violations.map(function (v) { return v.id; }));
    let added = 0, skipped = 0, bad = 0;
    data.violations.forEach(function (x) {
      if (!x || typeof x.id !== 'string' || !/^[A-Z0-9]{4,16}$/.test(x.id)) { bad++; return; }
      if (have.has(x.id)) { skipped++; return; }
      const lat = +x.lat, lng = +x.lng;
      if (!(lat > BBOX.minLat && lat < BBOX.maxLat && lng > BBOX.minLng && lng < BBOX.maxLng) || !vtype(x.type) || isNaN(new Date(x.ts).getTime())) { bad++; return; }
      const v = {
        id: x.id, ts: new Date(x.ts).toISOString(), source: ['citizen', 'camera', 'officer'].indexOf(x.source) >= 0 ? x.source : 'citizen',
        type: x.type, plate: normPlate(x.plate), vehicle: String(x.vehicle || 'Car').slice(0, 20), lat: +lat.toFixed(6), lng: +lng.toFixed(6),
        place: String(x.place || placeFor(lat, lng).place).slice(0, 80), zone: String(x.zone || placeFor(lat, lng).zone).slice(0, 40),
        unit: String(x.unit || 'Traffic East').slice(0, 40), desc: String(x.desc || '').slice(0, 500), photo: null, cameraId: x.cameraId || null,
        status: ['New', 'Verified'].concat(CLOSED).indexOf(x.status) >= 0 ? x.status : 'New', fine: Math.max(0, +x.fine || 0), paid: !!x.paid,
        challanNo: x.challanNo || undefined, respMin: x.respMin != null ? +x.respMin : undefined, priority: x.priority || undefined,
        history: (Array.isArray(x.history) ? x.history.slice(0, 30) : []).map(function (h) { return { at: h.at, by: String(h.by || '').slice(0, 60), action: String(h.action || '').slice(0, 120), remarks: String(h.remarks || '').slice(0, 300) }; })
      };
      if (v.plate && x.plateOcr != null && isFinite(+x.plateOcr)) v.plateOcr = Math.max(0, Math.min(100, Math.round(+x.plateOcr)));
      if (typeof x.photo === 'string' && x.photo.indexOf('data:image/') === 0) { try { const f = app.saveDataUrl(x.photo, v.id); v.photo = f.url; v.photoHash = f.sha256; } catch (e) { /* skip bad photo */ } }
      v.history.push({ at: new Date().toISOString(), by: ctx.user.name, action: 'Imported from phone sync file', remarks: data.device ? 'Phone ' + String(data.device).slice(0, 20) : '' });
      d.violations.push(v); have.add(v.id); added++;
    });
    d.violations.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
    app.save(); ctx.audit('import-sync', added + ' added, ' + skipped + ' already present, ' + bad + ' invalid');
    if (added) app.broadcast('viol', { update: true });
    return { added: added, skipped: skipped, invalid: bad };
  }, { roles: POLICE, limit: 40 * 1024 * 1024 });

  app.route('GET', '/api/export.csv', function (ctx) {
    const days = +ctx.query.days || 30; const since = Date.now() - days * 86400000;
    const cols = ['id', 'ts', 'source', 'type', 'plate', 'vehicle', 'place', 'zone', 'unit', 'lat', 'lng', 'status', 'fine', 'paid', 'respMin'];
    const q = function (x) { x = x == null ? '' : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    const rows = db().violations.filter(function (v) { return new Date(v.ts).getTime() >= since; }).map(function (v) { return cols.map(function (c) { return q(v[c]); }).join(','); });
    ctx.audit('export-csv', days + ' days');
    return { __raw: true, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': 'attachment; filename="parksmart-violations.csv"' }, body: cols.join(',') + '\n' + rows.join('\n') };
  }, { roles: POLICE });

  return app;
}

module.exports = build;
if (require.main === module) build().start();
