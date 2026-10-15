/* ParkSmart Mobile — on-phone replacement for server/core.js.
   The SAME server.js / seed.js run inside the phone: routes, rules, data and audit log.
   Data is saved on the phone (localStorage). No laptop, no Wi-Fi link needed. */
(function () {
  'use strict';

  // ---------------- SHA-256 (sync, small) ----------------
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256Bytes(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(bytes); m[l] = 0x80;
    var bits = l * 8; m[nb - 4] = (bits >>> 24) & 255; m[nb - 3] = (bits >>> 16) & 255; m[nb - 2] = (bits >>> 8) & 255; m[nb - 1] = bits & 255;
    m[nb - 5] = Math.floor(bits / 4294967296) & 255;
    var w = new Uint32Array(64);
    for (var o = 0; o < nb; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (i = 16; i < 64; i++) {
        var a0 = w[i - 15], a1 = w[i - 2];
        var s0 = ((a0 >>> 7) | (a0 << 25)) ^ ((a0 >>> 18) | (a0 << 14)) ^ (a0 >>> 3);
        var s1 = ((a1 >>> 17) | (a1 << 15)) ^ ((a1 >>> 19) | (a1 << 13)) ^ (a1 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function sha256(s) { return sha256Bytes(typeof s === 'string' ? utf8(s) : s); }
  function uid(n) { var a = new Uint8Array(n || 8); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256 | 0; }); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function hashPassword(pw, salt) { salt = salt || uid(16); return salt + ':' + sha256(salt + ':' + pw); }
  function checkPassword(pw, stored) { if (!stored || stored.indexOf(':') < 0) return false; return hashPassword(pw, stored.split(':')[0]) === stored; }
  function httpError(status, msg) { var e = new Error(msg); e.status = status; return e; }

  // ---------------- storage ----------------
  var DB_KEY = 'parksmart_mobile_db_v1', SESSION_KEY = 'parksmart_mobile_session';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { localStorage.setItem(k, v); }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var listeners = [];   // EventSource shims
  var current = null;

  function createApp(opts) {
    var db = null, routes = [], saveTimer = null, HANDLED = {};
    function writeNow() {
      saveTimer = null;
      var txt = JSON.stringify(db);
      try { lsSet(DB_KEY, txt); return; } catch (e) { /* storage full: drop the oldest photos and retry */ }
      var withPhoto = db.violations.filter(function (v) { return v.photo; });
      while (withPhoto.length) {
        var drop = withPhoto.splice(Math.max(0, withPhoto.length - 5), 5);
        drop.forEach(function (v) { v.photo = null; v.photoDropped = true; });
        try { lsSet(DB_KEY, JSON.stringify(db)); console.warn('ParkSmart: phone storage full, removed old photos'); return; } catch (e2) { }
      }
      if (db.audit && db.audit.length > 200) { db.audit.length = 200; try { lsSet(DB_KEY, JSON.stringify(db)); } catch (e3) { console.error('save failed', e3); } }
    }
    function save() { if (!saveTimer) saveTimer = setTimeout(writeNow, 400); }
    function audit(user, action, detail) {
      db.audit = db.audit || [];
      db.audit.unshift({ at: new Date().toISOString(), user: user ? user.username : '-', role: user ? user.role : '-', action: action, detail: detail || '' });
      if (db.audit.length > 1500) db.audit.length = 1500;
      save();
    }
    function publicUser(u) { var o = Object.assign({}, u); delete o.password; return o; }
    function currentUser() {
      var s; try { s = JSON.parse(lsGet(SESSION_KEY) || 'null'); } catch (e) { s = null; }
      if (!s || s.exp < Date.now()) return null;
      var u = (db.users || []).find(function (x) { return x.username === s.username && !x.disabled; });
      return u ? publicUser(u) : null;
    }
    function route(method, pattern, handler, ropts) {
      var keys = [];
      var re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^\\/]+)'; }) + '$');
      routes.push({ method: method, re: re, keys: keys, handler: handler, opts: ropts || {} });
    }
    function broadcast(event, data) {
      listeners.forEach(function (es) { setTimeout(function () { es._emit(event, data); }, 0); });
    }
    function saveDataUrl(dataUrl, prefix) {
      var m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl || '');
      if (!m) throw httpError(400, 'Bad file data');
      var bin = atob(m[2]), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { file: prefix, url: dataUrl, size: bytes.length, type: m[1], sha256: sha256Bytes(bytes) };
    }

    // ---- built-in routes (same as the laptop) ----
    var fails = { n: 0, until: 0 };
    route('POST', '/api/login', function (ctx) {
      if (fails.until > Date.now()) throw httpError(429, 'Too many attempts. Wait a minute and try again.');
      var u = (db.users || []).find(function (x) { return x.username === String(ctx.body.username || '').trim().toLowerCase() && !x.disabled; });
      if (!u || !checkPassword(ctx.body.password || '', u.password)) {
        fails.n++; if (fails.n >= 6) { fails.until = Date.now() + 60000; fails.n = 0; }
        audit(null, 'login-failed', String(ctx.body.username || '')); throw httpError(401, 'Wrong username or password');
      }
      fails.n = 0;
      lsSet(SESSION_KEY, JSON.stringify({ username: u.username, exp: Date.now() + 12 * 3600 * 1000 }));
      audit(u, 'login', 'phone'); return { user: publicUser(u) };
    }, { public: true });
    route('POST', '/api/logout', function () { lsDel(SESSION_KEY); return { ok: true }; }, { public: true });
    route('GET', '/api/me', function (ctx) { return { user: ctx.user, app: opts.appInfo || {} }; }, { public: true });
    route('GET', '/api/netinfo', function () { return { port: 0, addresses: [], urls: [], apk: null }; }, { public: true });
    route('GET', '/api/audit', function () { return (db.audit || []).slice(0, 400); }, { roles: ['admin'] });

    async function handle(method, url, bodyText) {
      var u = new URL(url, 'http://phone');
      var p = u.pathname;
      var r = routes.find(function (x) { return x.method === method && x.re.test(p); });
      if (!r) return { status: 404, body: { error: 'No such API: ' + method + ' ' + p } };
      var q = {}; u.searchParams.forEach(function (v, k) { q[k] = v; });
      var ctx = { req: { socket: { remoteAddress: 'phone' }, headers: {} }, res: null, db: db, query: q, params: {}, user: currentUser(), save: save,
        broadcast: broadcast, saveDataUrl: saveDataUrl, error: httpError, HANDLED: HANDLED, setHeader: function () {} };
      ctx.audit = function (a, d) { audit(ctx.user, a, d); };
      var mm = r.re.exec(p); r.keys.forEach(function (k, i) { ctx.params[k] = decodeURIComponent(mm[i + 1]); });
      try {
        if (!r.opts.public && !ctx.user) throw httpError(401, 'Please log in');
        if (r.opts.roles && (!ctx.user || r.opts.roles.indexOf(ctx.user.role) < 0)) throw httpError(403, 'Your role (' + (ctx.user ? ctx.user.role : 'guest') + ') cannot do this');
        ctx.body = {};
        if (bodyText) { try { ctx.body = JSON.parse(bodyText); } catch (e) { throw httpError(400, 'Bad JSON'); } }
        var out = await r.handler(ctx);
        if (out && out.__raw) return { status: 200, raw: true, type: out.type || 'text/plain', headers: out.headers || {}, text: out.body };
        return { status: 200, body: out === undefined ? { ok: true } : out };
      } catch (e) {
        if (!e.status) console.error(e);
        return { status: e.status || 500, body: { error: e.message || 'Error' } };
      }
    }

    var api = {
      route: route, broadcast: broadcast, save: save, audit: audit, hashPassword: hashPassword, sha256: sha256, uid: uid,
      saveDataUrl: saveDataUrl, httpError: httpError, handle: handle,
      get db() { return db; }, get port() { return 0; }, UPLOADS: '',
      start: function (cb) {
        var raw = lsGet(DB_KEY);
        if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
        if (!db) { db = opts.seed(); db.audit = db.audit || []; writeNow(); }
        if (opts.onLoad) opts.onLoad(db);
        if (opts.tick) setInterval(function () { try { opts.tick(api); } catch (e) { console.error(e); } }, opts.tickMs || 5000);
        window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); writeNow(); } });
        document.addEventListener('visibilitychange', function () { if (document.hidden && saveTimer) { clearTimeout(saveTimer); writeNow(); } });
        if (cb) cb(0);
      },
      flush: function () { if (saveTimer) { clearTimeout(saveTimer); writeNow(); } },
      reset: function () { lsDel(DB_KEY); lsDel(SESSION_KEY); }
    };
    current = api;
    return api;
  }

  // ---------------- fetch + EventSource shims ----------------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function isApi(url) { return typeof url === 'string' && /^\/?api\//.test(url.replace(/^https?:\/\/[^/]+/, '').replace(/^\.\//, '')); }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!isApi(url) || !current) return realFetch ? realFetch(input, init) : Promise.reject(new Error('offline'));
    init = init || {};
    var path = '/' + url.replace(/^https?:\/\/[^/]+/, '').replace(/^\.?\//, '');
    return current.handle((init.method || 'GET').toUpperCase(), path, init.body || '').then(function (r) {
      if (r.raw) return new Response(r.text, { status: r.status, headers: Object.assign({ 'Content-Type': r.type }, r.headers) });
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    });
  };
  function LocalEventSource() { this._l = {}; listeners.push(this); this.readyState = 1; }
  LocalEventSource.prototype.addEventListener = function (evt, fn) { (this._l[evt] = this._l[evt] || []).push(fn); };
  LocalEventSource.prototype.removeEventListener = function (evt, fn) { this._l[evt] = (this._l[evt] || []).filter(function (f) { return f !== fn; }); };
  LocalEventSource.prototype.close = function () { var me = this; listeners = listeners.filter(function (x) { return x !== me; }); };
  LocalEventSource.prototype._emit = function (evt, data) { (this._l[evt] || []).forEach(function (fn) { try { fn({ data: JSON.stringify(data) }); } catch (e) { console.error(e); } }); };
  window.EventSource = LocalEventSource;

  // ---------------- tiny CommonJS loader for server.js / seed.js / rng.js ----------------
  var defs = {}, cache = {};
  window.PS_define = function (name, fn) { defs[name] = fn; };
  function req(name) {
    if (name === 'path') return { join: function () { return Array.prototype.slice.call(arguments).join('/'); } };
    if (name === './core') return { createApp: createApp, hashPassword: hashPassword, sha256: sha256, uid: uid };
    if (cache[name]) return cache[name].exports;
    if (!defs[name]) throw new Error('module not found: ' + name);
    var m = { exports: {} }; cache[name] = m; defs[name](m, m.exports, req, '/server'); return m.exports;
  }
  window.PS_require = req;
  window.PS_LOCAL_CORE = { createApp: createApp, sha256: sha256, sha256Bytes: sha256Bytes, hashPassword: hashPassword, checkPassword: checkPassword, current: function () { return current; } };
})();
