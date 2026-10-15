/* common.js — shared front-end helpers: API, icons, theme, router, modal, toast, phone QR, login. */
(function () {
  'use strict';

  // ---------------- icons (24x24 stroke icons, drawn for this project) ----------------
  var P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
    files: '<path d="M15 3H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M15 3v4h4M4 7v12a2 2 0 0 0 2 2h9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.8 3.5-5.5 6.5-5.5s5.7 1.7 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.4 3.6 5.2"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    car: '<path d="M5 17h14v-4l-2-5H7l-2 5z"/><path d="M3 13h18"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    cctv: '<path d="M3 6l13 4-2 5-12-4z"/><path d="M16 10l3 1M6 13l-1 5H2M10 15l1 3h4"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    shieldcheck: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    filter: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    arrowright: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowleft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    send: '<path d="M21 3 3 10l7 3 3 7z"/><path d="M10 13 21 3"/>',
    rupee: '<path d="M7 4h10M7 9h10M7 4h3a5 5 0 0 1 0 10H7l8 7"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    gavel: '<path d="m14 13-8 8-3-3 8-8"/><path d="m13 4 7 7M10 7l7 7M15.5 2.5l6 6"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    hash: '<path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    droplet: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
    package: '<path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
    tow: '<path d="M3 17h10V9H3zM13 12h4l3 3v2h-7"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="16.5" cy="17.5" r="1.7"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
  }

  // ---------------- police-style badge logo (original artwork) ----------------
  function logo(symbol, cls) {
    return '<svg class="' + (cls || 'logo') + '" viewBox="0 0 100 110" role="img" aria-label="Police badge logo">' +
      '<path d="M50 4 88 18v34c0 27-17 45-38 54C29 97 12 79 12 52V18z" fill="#0b2a5b" stroke="#e0b742" stroke-width="5"/>' +
      '<path d="M50 14 79 25v27c0 21-13 36-29 43-16-7-29-22-29-43V25z" fill="none" stroke="#e0b742" stroke-width="1.5" opacity=".7"/>' +
      '<path d="m50 20 3.2 6.6 7.2 1-5.2 5 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="#e0b742"/>' +
      '<g transform="translate(29 44) scale(1.75)" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (P[symbol] || P.shield) + '</g>' +
      '<path d="M22 92c8 6 18 9 28 10 10-1 20-4 28-10" fill="none" stroke="#b3261e" stroke-width="6" stroke-linecap="round"/>' +
      '</svg>';
  }

  // ---------------- escaping & formatting ----------------
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(d) { if (!d) return '—'; d = new Date(d); if (isNaN(d)) return '—'; return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtTime(d) { d = new Date(d); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function fmtDateTime(d) { if (!d) return '—'; return fmtDate(d) + ', ' + fmtTime(d); }
  function ago(d) {
    var s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hr ago'; if (s < 86400 * 30) return Math.floor(s / 86400) + ' days ago';
    return fmtDate(d);
  }
  function fmtINR(n) {
    if (n == null || isNaN(n)) return '—';
    n = Math.round(n);
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
    return '₹' + n.toLocaleString('en-IN');
  }
  function num(n) { return (n || 0).toLocaleString('en-IN'); }

  // ---------------- storage (safe) ----------------
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------------- theme ----------------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    lsSet('theme', t);
    var b = document.getElementById('themeBtn');
    if (b) b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon') + '<span class="lbl">' + (t === 'dark' ? 'Light' : 'Dark') + '</span>';
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  // ---------------- API ----------------
  var state = { user: null, app: {} };
  function api(method, url, body) {
    var o = { method: method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(url, o).then(function (r) {
      return r.text().then(function (t) {
        var j; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { error: t }; }
        if (!r.ok) {
          if (r.status === 401 && url !== '/api/login') { state.user = null; renderChrome(); }
          var err = new Error(j.error || ('Error ' + r.status)); err.status = r.status; throw err;
        }
        return j;
      });
    });
  }
  function apiSafe(method, url, body) { return api(method, url, body).catch(function (e) { toast(e.message, 'err'); throw e; }); }

  // ---------------- toast & modal ----------------
  function toast(msg, kind) {
    var root = document.getElementById('toasts');
    var d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.innerHTML = icon(kind === 'err' ? 'alert' : kind === 'ok' ? 'check' : 'info') + '<span>' + h(msg) + '</span>';
    root.appendChild(d);
    setTimeout(function () { d.remove(); }, kind === 'err' ? 5000 : 3200);
  }
  function modal(title, bodyHtml, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true"><div class="mh"><h3>' + (opts.icon ? icon(opts.icon) : '') + h(title) + '</h3>' +
      (opts.print ? '<button class="btn sm" data-print>' + icon('print') + ' Print</button>' : '') +
      '<button class="x-btn" data-close aria-label="Close">' + icon('x', 'lg') + '</button></div><div class="mb">' + bodyHtml + '</div>' + (opts.footer ? '<div class="mf">' + opts.footer + '</div>' : '') + '</div>';
    root.appendChild(back);
    function close() { back.remove(); if (opts.onClose) opts.onClose(); }
    back.addEventListener('click', function (e) { if (e.target === back && !opts.sticky) close(); });
    back.querySelector('[data-close]').onclick = close;
    var pb = back.querySelector('[data-print]');
    if (pb) pb.onclick = function () { printModal(); };
    back.close = close;
    return back;
  }
  function printModal() {
    document.body.classList.add('printing-modal');
    setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printing-modal'); }, 300); }, 50);
  }
  function confirmBox(title, msg, okLabel) {
    return new Promise(function (resolve) {
      var m = modal(title, '<p>' + h(msg) + '</p>', { footer: '<button class="btn" data-no>Cancel</button><button class="btn primary" data-yes>' + h(okLabel || 'OK') + '</button>', onClose: function () { resolve(false); } });
      m.querySelector('[data-no]').onclick = function () { m.close(); };
      m.querySelector('[data-yes]').onclick = function () { resolve(true); m.remove(); };
    });
  }

  // ---------------- phone access (QR) ----------------
  function phoneModal() {
    api('GET', '/api/netinfo').then(function (n) {
      var here = location.hostname;
      var urls = n.urls.slice();
      var cur = (here !== 'localhost' && here !== '127.0.0.1') ? location.origin : (urls[0] || null);
      var html = '';
      if (!cur) {
        html = '<div class="note warn">No Wi-Fi or hotspot network found on this laptop. Connect the laptop to Wi-Fi or turn on a phone hotspot, then open this again.</div>';
      } else {
        var qr = qrcode(0, 'M'); qr.addData(cur); qr.make();
        html = '<div class="center"><div style="background:#fff;display:inline-block;padding:10px;border-radius:8px">' + qr.createSvgTag({ cellSize: 6, margin: 2 }) + '</div>' +
          '<p style="font-size:20px;margin:8px 0" class="mono">' + h(cur) + '</p></div>' +
          '<ol class="small"><li>Connect the phone to the <b>same Wi-Fi or hotspot</b> as this laptop.</li><li>Scan the QR with the phone camera (or type the address).</li>' +
          '<li>If it does not open: run <b>ALLOW-PHONE-ACCESS.bat</b> once (click Yes). College Wi-Fi often blocks phone-to-laptop traffic, so use a phone hotspot instead.</li></ol>';
        if (n.apk) {
          var apkUrl = cur + n.apk;
          var q2 = qrcode(0, 'M'); q2.addData(apkUrl); q2.make();
          html += '<div class="hr"></div><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div style="background:#fff;padding:6px;border-radius:6px;flex:none">' + q2.createSvgTag({ cellSize: 3, margin: 1 }) + '</div>' +
            '<div class="small"><b>Android app</b><br>Scan this to download the app, then open the file and tap Install (allow &quot;install unknown apps&quot; if asked).<br><a href="' + h(n.apk) + '">' + icon('download') + ' Download app</a></div></div>';
        }
        if (urls.length > 1) html += '<p class="small muted">Other addresses on this laptop: ' + urls.filter(function (u) { return u !== cur; }).map(function (u) { return '<span class="mono">' + h(u) + '</span>'; }).join(', ') + '</p>';
      }
      modal('Open on phone', html, { icon: 'phone' });
    }).catch(function (e) { toast(e.message, 'err'); });
  }

  // ---------------- charts ----------------
  var charts = [];
  function chart(canvas, cfg) {
    if (!window.Chart) return null;
    var txt = cssVar('--muted'), grid = cssVar('--border');
    Chart.defaults.font.family = '"Times New Roman", Times, serif';
    Chart.defaults.font.size = 13;
    Chart.defaults.color = txt;
    Chart.defaults.borderColor = grid;
    cfg.options = cfg.options || {};
    cfg.options.maintainAspectRatio = false;
    cfg.options.responsive = true;
    var c = new Chart(canvas, cfg);
    charts.push(c);
    return c;
  }
  function palette() { return [cssVar('--brand-2'), cssVar('--red'), cssVar('--green'), cssVar('--amber'), cssVar('--purple'), '#0e8a8a', '#8a5a2b', '#5d6b85', '#c2185b', '#2e7d32']; }
  function destroyCharts() { charts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); charts = []; }

  // ---------------- maps (Leaflet with offline fallback) ----------------
  function makeMap(el, center, zoom) {
    var map = L.map(el, { zoomControl: true, attributionControl: true }).setView(center, zoom || 14);
    var errors = 0, loaded = 0, offlineShown = false;
    var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
    tiles.on('tileerror', function () { errors++; if (errors > 3 && loaded === 0) goOffline(); });
    tiles.on('tileload', function () { loaded++; });
    if (navigator.onLine === false) goOffline(); else tiles.addTo(map);
    setTimeout(function () { if (loaded === 0) goOffline(); }, 6000);
    function goOffline() {
      if (offlineShown) return; offlineShown = true;
      try { map.removeLayer(tiles); } catch (e) {}
      // simple offline backdrop: graticule + Bay of Bengal shading along the Puducherry coast
      var sea = [[12.10, 79.8395], [11.98, 79.8420], [11.94, 79.8375], [11.925, 79.8345], [11.90, 79.8270], [11.85, 79.8000], [11.80, 79.79], [11.80, 80.05], [12.10, 80.05]];
      L.polygon(sea, { color: '#5b8fd6', weight: 1.5, fillColor: '#9cc3f0', fillOpacity: .35, interactive: false }).addTo(map);
      var g = L.layerGroup().addTo(map);
      for (var la = 11.80; la <= 12.10; la += 0.01) L.polyline([[la, 79.70], [la, 80.0]], { color: '#8895aa', weight: .4, opacity: .5, interactive: false }).addTo(g);
      for (var lo = 79.70; lo <= 80.0; lo += 0.01) L.polyline([[11.80, lo], [12.10, lo]], { color: '#8895aa', weight: .4, opacity: .5, interactive: false }).addTo(g);
      var tag = document.createElement('div'); tag.className = 'offline-tag'; tag.textContent = 'Offline map (no internet)';
      el.appendChild(tag);
    }
    setTimeout(function () { map.invalidateSize(); }, 200);
    return map;
  }

  // ---------------- router + chrome ----------------
  var CFG = null;
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/');
    return { id: parts[0] || '', args: parts.slice(1).map(decodeURIComponent) };
  }
  function go(path) { location.hash = '#/' + path; }
  function canSee(v) {
    if (v.public) return true;
    if (!state.user) return false;
    return !v.roles || v.roles.indexOf(state.user.role) >= 0;
  }
  function renderChrome() {
    var top = document.getElementById('topbar');
    var u = state.user;
    top.innerHTML =
      '<button class="tb-btn menu-btn" id="menuBtn" aria-label="Menu">' + icon('menu') + '</button>' +
      logo(CFG.logoSymbol) +
      '<div class="titles"><div class="t1">' + h(CFG.title) + '</div><div class="t2">' + h(CFG.subtitle) + '</div></div>' +
      '<div class="spacer"></div>' +
      '<button class="tb-btn" id="phoneBtn" title="Open on phone">' + icon('phone') + '<span class="lbl">Phone</span></button>' +
      '<button class="tb-btn" id="themeBtn" title="Light / dark"></button>' +
      (u ? '<span class="userchip">' + icon('user') + '<span class="uname">' + h(u.name) + '<span class="role">' + h(u.title || u.role) + '</span></span></span>' +
        '<button class="tb-btn" id="logoutBtn" title="Log out">' + icon('logout') + '<span class="lbl">Logout</span></button>'
        : '<button class="tb-btn" id="loginBtn">' + icon('lock') + '<span class="lbl">Officer login</span></button>');
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    document.getElementById('themeBtn').onclick = toggleTheme;
    document.getElementById('phoneBtn').onclick = phoneModal;
    document.getElementById('menuBtn').onclick = function () { document.getElementById('nav').classList.toggle('open'); };
    if (u) document.getElementById('logoutBtn').onclick = function () { api('POST', '/api/logout').then(function () { state.user = null; renderChrome(); go(CFG.publicHome || ''); render(); }); };
    else document.getElementById('loginBtn').onclick = function () { go('login'); };
    renderNav();
  }
  function renderNav() {
    var nav = document.getElementById('nav');
    var cur = route().id || defaultView();
    var html = '';
    var lastSect = null;
    CFG.views.forEach(function (v) {
      if (v.hidden || !canSee(v)) return;
      if (v.section && v.section !== lastSect) { html += '<div class="sect">' + h(v.section) + '</div>'; lastSect = v.section; }
      html += '<a href="#/' + v.id + '" class="' + (v.id === cur ? 'active' : '') + '">' + icon(v.icon) + '<span>' + h(v.label) + '</span></a>';
    });
    html += '<div class="foot">' + h(CFG.footer || '') + '<br>Puducherry Police Hackathon 2026</div>';
    nav.innerHTML = html;
    nav.querySelectorAll('a').forEach(function (a) { a.onclick = function () { nav.classList.remove('open'); }; });
  }
  function defaultView() { return state.user ? (CFG.homeFor ? CFG.homeFor(state.user) : CFG.views[0].id) : (CFG.publicHome || 'login'); }
  function render() {
    destroyCharts();
    var mr = document.getElementById('modal-root'); if (mr) mr.innerHTML = '';
    var r = route();
    if (!r.id) { go(defaultView()); return; }
    // a fresh <main> for every page, so timers / late replies of the previous page see it is gone (isConnected)
    var oldMain = document.getElementById('view'), main = oldMain.cloneNode(false);
    oldMain.parentNode.replaceChild(main, oldMain);
    if (r.id === 'login') { renderNav(); return loginView(main); }
    var v = CFG.views.find(function (x) { return x.id === r.id; });
    if (!v) { go(defaultView()); return; }
    if (!canSee(v)) {
      if (!state.user) { sessionStorageSafe('after', r.id); return loginView(main); }
      main.innerHTML = '<div class="card empty">' + icon('lock', 'xl') + '<p>Your role cannot open this page.</p></div>'; renderNav(); return;
    }
    renderNav();
    main.innerHTML = '';
    window.scrollTo(0, 0);
    try { v.render(main, r.args); } catch (e) { console.error(e); main.innerHTML = '<div class="card note red">Something went wrong: ' + h(e.message) + '</div>'; }
  }
  function sessionStorageSafe(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  function loginView(main) {
    var demo = CFG.demoUsers || [];
    main.innerHTML = '<div class="login-wrap"><div class="card login-card">' + logo(CFG.logoSymbol, 'logo-big') +
      '<h2 class="center">' + h(CFG.title) + '</h2><p class="center muted small">' + h(CFG.subtitle) + '</p>' +
      '<form id="loginForm"><label class="f">Username<input type="text" name="username" autocomplete="username" autocapitalize="none" required></label>' +
      '<label class="f">Password<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<button class="btn primary" style="width:100%" type="submit">' + icon('lock') + ' Log in</button></form>' +
      (demo.length ? '<div class="hr"></div><div class="demo-users"><b>Demo logins</b> (tap to fill):<br>' + demo.map(function (d, i) { return '<button class="btn sm" data-i="' + i + '">' + h(d.label) + '</button>'; }).join('') + '</div>' : '') +
      (CFG.publicHome ? '<p class="center small" style="margin-top:12px"><a href="#/' + CFG.publicHome + '">' + icon('arrowleft') + ' Back to public page</a></p>' : '') +
      '</div></div>';
    var f = main.querySelector('#loginForm');
    main.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { var d = demo[+b.dataset.i]; f.username.value = d.u; f.password.value = d.p; }; });
    f.onsubmit = function (e) {
      e.preventDefault();
      api('POST', '/api/login', { username: f.username.value, password: f.password.value }).then(function (r) {
        state.user = r.user; renderChrome(); toast('Welcome, ' + r.user.name, 'ok');
        var after = sessionStorageSafe('after'); sessionStorageSafe('after', '');
        var r2 = route().id;
        if (after) go(after); else if (r2 === 'login' || !r2) go(defaultView()); else render();
      }).catch(function (e) { toast(e.message, 'err'); });
    };
  }

  // ---------------- live updates (SSE) ----------------
  var listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function startStream() {
    if (!window.EventSource) return;
    var es = new EventSource('/api/stream');
    Object.keys(CFG.streamEvents || {}).forEach(function () {});
    (CFG.streamEvents || []).forEach(function (evt) {
      es.addEventListener(evt, function (m) { var d; try { d = JSON.parse(m.data); } catch (e) { return; } (listeners[evt] || []).forEach(function (fn) { try { fn(d); } catch (e) { console.error(e); } }); });
    });
  }

  function boot(cfg) {
    CFG = cfg;
    document.title = cfg.title;
    applyTheme(lsGet('theme', (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'));
    api('GET', '/api/me').then(function (r) { state.user = r.user; state.app = r.app; }).catch(function () {}).then(function () {
      renderChrome(); render(); startStream();
      window.addEventListener('hashchange', function () { listeners = {}; render(); });
    });
  }

  // ---------------- files ----------------
  function readFileAsDataUrl(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Could not read file')); };
      fr.onload = function () {
        if (!/^image\//.test(file.type) || !maxDim) return resolve(fr.result);
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, maxDim / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality || 0.85));
        };
        img.onerror = function () { reject(new Error('Not an image')); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function download(name, text, type) {
    var b = new Blob([text], { type: type || 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function toCSV(rows, cols) {
    function q(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return cols.map(function (c) { return q(c.label); }).join(',') + '\n' + rows.map(function (r) { return cols.map(function (c) { return q(typeof c.get === 'function' ? c.get(r) : r[c.key]); }).join(','); }).join('\n');
  }
  function qrSvg(text, cell) { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 3, margin: 1 }); }

  window.UI = {
    icon: icon, logo: logo, h: h, fmtDate: fmtDate, fmtTime: fmtTime, fmtDateTime: fmtDateTime, ago: ago, fmtINR: fmtINR, num: num,
    api: api, apiSafe: apiSafe, toast: toast, modal: modal, confirm: confirmBox, printModal: printModal, chart: chart, palette: palette, cssVar: cssVar,
    makeMap: makeMap, boot: boot, go: go, render: render, on: on, state: state, readFileAsDataUrl: readFileAsDataUrl, download: download, toCSV: toCSV,
    qrSvg: qrSvg, lsGet: lsGet, lsSet: lsSet, phoneModal: phoneModal
  };
})();
