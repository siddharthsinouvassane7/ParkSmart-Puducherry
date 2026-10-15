// ---------------------------------------------------------------------------
// core.js — tiny zero-dependency web framework shared by the hackathon apps.
// Uses only Node.js built-in modules (http, fs, path, os, crypto).
// Works on Node 14+.
// ---------------------------------------------------------------------------
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.map': 'application/json', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.webm': 'video/webm', '.gz': 'application/octet-stream', '.apk': 'application/vnd.android.package-archive'
};

// ---------- password hashing (scrypt) ----------
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return salt + ':' + hash;
}
function checkPassword(pw, stored) {
  if (!stored || stored.indexOf(':') < 0) return false;
  const salt = stored.split(':')[0];
  const a = Buffer.from(hashPassword(pw, salt));
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function uid(n) { return crypto.randomBytes(n || 8).toString('hex'); }

// ---------- LAN addresses (hide virtual adapters) ----------
function lanAddresses() {
  const out = [];
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (name) {
    const low = name.toLowerCase();
    if (/virtualbox|vmware|vethernet|docker|wsl|hyper-v|loopback|vbox|tailscale|zerotier/.test(low)) return;
    (ifs[name] || []).forEach(function (a) {
      const fam = a.family === 4 ? 'IPv4' : a.family;
      if (fam !== 'IPv4' || a.internal) return;
      if (/^192\.168\.56\./.test(a.address) || /^169\.254\./.test(a.address)) return;
      out.push({ name: name, address: a.address, hotspot: /^192\.168\.137\./.test(a.address) });
    });
  });
  // Prefer hotspot / wifi style addresses first
  out.sort(function (x, y) { return (y.hotspot ? 1 : 0) - (x.hotspot ? 1 : 0); });
  return out;
}

// ---------- the app ----------
function createApp(opts) {
  const ROOT = opts.root;                      // app folder
  const PUBLIC = path.join(ROOT, 'public');
  const DATA_DIR = opts.dataDir || path.join(ROOT, 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');
  const UPLOADS = path.join(DATA_DIR, 'uploads');
  [DATA_DIR, UPLOADS].forEach(function (d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  // ---- database (one JSON file, atomic writes) ----
  let db;
  function loadDb() {
    if (fs.existsSync(DB_FILE)) {
      try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
      catch (e) {
        console.error('  ! data/db.json was damaged — keeping a backup and re-creating demo data.');
        fs.copyFileSync(DB_FILE, DB_FILE + '.broken-' + Date.now());
        db = null;
      }
    }
    if (!db) {
      db = opts.seed();
      db.audit = db.audit || [];
      writeNow();
      console.log('  Demo data created (' + DB_FILE + ')');
    }
    if (opts.onLoad) opts.onLoad(db);
  }
  let saveTimer = null;
  function writeNow() {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }
  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () { saveTimer = null; try { writeNow(); } catch (e) { console.error('save failed', e.message); } }, 300);
  }
  function audit(user, action, detail) {
    db.audit = db.audit || [];
    db.audit.unshift({ at: new Date().toISOString(), user: user ? user.username : '-', role: user ? user.role : '-', action: action, detail: detail || '' });
    if (db.audit.length > 3000) db.audit.length = 3000;
    save();
  }

  // ---- sessions ----
  const sessions = new Map();   // token -> {username, exp}
  const SESSION_MS = 12 * 3600 * 1000;
  function getCookie(req, name) {
    const c = req.headers.cookie || '';
    const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function currentUser(req) {
    const tok = getCookie(req, opts.cookie || 'sid') || req.headers['x-session'];
    if (!tok) return null;
    const s = sessions.get(tok);
    if (!s || s.exp < Date.now()) { sessions.delete(tok); return null; }
    const u = (db.users || []).find(function (x) { return x.username === s.username && !x.disabled; });
    if (!u) return null;
    return publicUser(u);
  }
  function publicUser(u) { const o = Object.assign({}, u); delete o.password; return o; }

  // ---- login rate limiting ----
  const fails = new Map();

  // ---- routes ----
  const routes = [];
  function route(method, pattern, handler, ropts) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^\\/]+)'; }) + '$');
    routes.push({ method: method, re: re, keys: keys, handler: handler, opts: ropts || {} });
  }

  // ---- server-sent events ----
  const clients = new Set();
  function broadcast(event, data) {
    const msg = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
    clients.forEach(function (res) { try { res.write(msg); } catch (e) { clients.delete(res); } });
  }

  // ---- helpers ----
  function sendJson(res, code, obj, headers) {
    const body = JSON.stringify(obj);
    res.writeHead(code, Object.assign({ 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }, headers || {}));
    res.end(body);
  }
  function readBody(req, limit) {
    return new Promise(function (resolve, reject) {
      let size = 0; const chunks = [];
      req.on('data', function (c) {
        size += c.length;
        if (size > limit) { reject(Object.assign(new Error('Upload too large'), { status: 413 })); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
      req.on('error', reject);
    });
  }
  function saveDataUrl(dataUrl, prefix) {
    const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl || '');
    if (!m) throw Object.assign(new Error('Bad file data'), { status: 400 });
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf', 'text/plain': '.txt', 'text/csv': '.csv' };
    const ext = extMap[m[1]] || '.bin';
    const buf = Buffer.from(m[2], 'base64');
    const name = (prefix || 'f') + '-' + Date.now().toString(36) + '-' + uid(4) + ext;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return { file: name, url: '/uploads/' + name, size: buf.length, type: m[1], sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  }
  function httpError(status, msg) { return Object.assign(new Error(msg), { status: status }); }

  function serveStatic(req, res, urlPath) {
    let base = PUBLIC;
    let rel = urlPath;
    if (urlPath.indexOf('/uploads/') === 0) { base = UPLOADS; rel = urlPath.slice('/uploads'.length); }
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(base, decodeURIComponent(rel)));
    if (file.indexOf(base) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
    fs.stat(file, function (err, st) {
      if (err || !st.isFile()) {
        if (base === PUBLIC && !path.extname(rel)) return serveStatic(req, res, '/index.html');
        res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
      }
      const ext = path.extname(file).toLowerCase();
      const hdr = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': (ext === '.html' || ext === '.apk') ? 'no-store' : 'max-age=300', 'X-Content-Type-Options': 'nosniff' };
      if (ext === '.apk') hdr['Content-Disposition'] = 'attachment; filename="' + path.basename(file) + '"';
      hdr['Accept-Ranges'] = 'bytes';
      // video players ask for parts of the file (Range) to seek and loop
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m && (m[1] !== '' || m[2] !== '')) {
        let start = m[1] === '' ? Math.max(0, st.size - (+m[2])) : +m[1];
        let end = m[1] !== '' && m[2] !== '' ? Math.min(+m[2], st.size - 1) : st.size - 1;
        if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
        hdr['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
        hdr['Content-Length'] = end - start + 1;
        res.writeHead(206, hdr);
        return fs.createReadStream(file, { start: start, end: end }).pipe(res);
      }
      res.writeHead(200, hdr);
      fs.createReadStream(file).pipe(res);
    });
  }

  let PORT = opts.port;

  // ---- built-in routes ----
  route('POST', '/api/login', function (ctx) {
    const ip = ctx.req.socket.remoteAddress || '';
    const f = fails.get(ip) || { n: 0, until: 0 };
    if (f.until > Date.now()) throw httpError(429, 'Too many attempts. Wait a minute and try again.');
    const u = (db.users || []).find(function (x) { return x.username === String(ctx.body.username || '').trim().toLowerCase() && !x.disabled; });
    if (!u || !checkPassword(ctx.body.password || '', u.password)) {
      f.n++; if (f.n >= 6) { f.until = Date.now() + 60000; f.n = 0; } fails.set(ip, f);
      audit(null, 'login-failed', String(ctx.body.username || ''));
      throw httpError(401, 'Wrong username or password');
    }
    fails.delete(ip);
    const tok = uid(24);
    sessions.set(tok, { username: u.username, exp: Date.now() + SESSION_MS });
    audit(u, 'login', '');
    ctx.setHeader('Set-Cookie', (opts.cookie || 'sid') + '=' + tok + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=' + (SESSION_MS / 1000));
    return { user: publicUser(u) };
  }, { public: true });

  route('POST', '/api/logout', function (ctx) {
    const tok = getCookie(ctx.req, opts.cookie || 'sid');
    if (tok) sessions.delete(tok);
    ctx.setHeader('Set-Cookie', (opts.cookie || 'sid') + '=; Path=/; Max-Age=0');
    return { ok: true };
  }, { public: true });

  route('GET', '/api/me', function (ctx) { return { user: ctx.user, app: opts.appInfo || {} }; }, { public: true });

  route('GET', '/api/netinfo', function () {
    const addrs = lanAddresses();
    let apk = null;
    try { const f = fs.readdirSync(path.join(PUBLIC, 'app')).filter(function (n) { return /\.apk$/i.test(n); })[0]; if (f) apk = '/app/' + f; } catch (e) {}
    return { port: PORT, addresses: addrs, urls: addrs.map(function (a) { return 'http://' + a.address + ':' + PORT; }), apk: apk };
  }, { public: true });

  route('GET', '/api/audit', function () { return (db.audit || []).slice(0, 400); }, { roles: ['admin'] });

  route('GET', '/api/stream', function (ctx) {
    ctx.res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
    ctx.res.write('retry: 3000\n\n');
    clients.add(ctx.res);
    ctx.req.on('close', function () { clients.delete(ctx.res); });
    return ctx.HANDLED;
  }, { public: true });

  const HANDLED = {};

  // ---- request handler ----
  async function handle(req, res) {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    if (p.indexOf('/api/') !== 0) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      return serveStatic(req, res, p);
    }
    const r = routes.find(function (x) { return x.method === req.method && x.re.test(p); });
    if (!r) return sendJson(res, 404, { error: 'No such API: ' + req.method + ' ' + p });
    const extraHeaders = {};
    const ctx = {
      req: req, res: res, db: db, query: Object.fromEntries(u.searchParams), params: {},
      user: currentUser(req), save: save, audit: null, broadcast: broadcast, saveDataUrl: saveDataUrl,
      error: httpError, HANDLED: HANDLED, setHeader: function (k, v) { extraHeaders[k] = v; }
    };
    ctx.audit = function (action, detail) { audit(ctx.user, action, detail); };
    const m = r.re.exec(p); r.keys.forEach(function (k, i) { ctx.params[k] = decodeURIComponent(m[i + 1]); });
    try {
      if (!r.opts.public && !ctx.user) throw httpError(401, 'Please log in');
      if (r.opts.roles && (!ctx.user || r.opts.roles.indexOf(ctx.user.role) < 0)) throw httpError(403, 'Your role (' + (ctx.user ? ctx.user.role : 'guest') + ') cannot do this');
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const raw = await readBody(req, r.opts.limit || 12 * 1024 * 1024);
        if (raw) { try { ctx.body = JSON.parse(raw); } catch (e) { throw httpError(400, 'Bad JSON'); } } else ctx.body = {};
      } else ctx.body = {};
      const out = await r.handler(ctx);
      if (out === HANDLED) return;
      if (out && out.__raw) {
        res.writeHead(200, Object.assign({ 'Content-Type': out.type || 'text/plain', 'Cache-Control': 'no-store' }, out.headers || {}, extraHeaders));
        return res.end(out.body);
      }
      sendJson(res, 200, out === undefined ? { ok: true } : out, extraHeaders);
    } catch (e) {
      if (!e.status) console.error(e);
      sendJson(res, e.status || 500, { error: e.message || 'Server error' }, extraHeaders);
    }
  }

  // ---- start ----
  function start(cb) {
    loadDb();
    const server = http.createServer(function (req, res) { handle(req, res).catch(function (e) { console.error(e); try { res.end(); } catch (x) {} }); });
    const maxPort = opts.maxPort || PORT + 8;
    server.on('error', function (e) {
      if (e.code === 'EADDRINUSE' && PORT < maxPort) { PORT++; setTimeout(function () { server.listen(PORT, '0.0.0.0'); }, 50); }
      else { console.error('  Could not start server:', e.message); process.exit(1); }
    });
    server.on('listening', function () {
      const addrs = lanAddresses();
      console.log('');
      console.log('  ================================================================');
      console.log('   ' + (opts.title || 'App') + ' is RUNNING');
      console.log('  ================================================================');
      console.log('   On this laptop :  http://localhost:' + PORT);
      addrs.forEach(function (a) { console.log('   On phone (same Wi-Fi/hotspot): http://' + a.address + ':' + PORT + '   [' + a.name + ']'); });
      if (!addrs.length) console.log('   (No Wi-Fi/LAN found — phone access needs a hotspot or Wi-Fi)');
      console.log('');
      console.log('   Keep this window open during the demo. Close it to stop.');
      console.log('  ================================================================');
      if (opts.tick) setInterval(function () { try { opts.tick(api); } catch (e) { console.error('tick', e); } }, opts.tickMs || 5000);
      if (!process.env.NO_BROWSER && process.platform === 'win32') exec('start "" "http://localhost:' + PORT + '"');
      if (cb) cb(PORT);
    });
    server.listen(PORT, '0.0.0.0');
    process.on('SIGINT', function () { try { writeNow(); } catch (e) {} process.exit(0); });
    process.on('exit', function () { try { if (saveTimer) writeNow(); } catch (e) {} });
    api.server = server;
    return server;
  }

  const api = {
    route: route, start: start, broadcast: broadcast, save: save, audit: audit,
    hashPassword: hashPassword, sha256: sha256, uid: uid, saveDataUrl: saveDataUrl, httpError: httpError,
    get db() { return db; }, get port() { return PORT; }, UPLOADS: UPLOADS
  };
  return api;
}

module.exports = { createApp: createApp, hashPassword: hashPassword, sha256: sha256, uid: uid, lanAddresses: lanAddresses };
