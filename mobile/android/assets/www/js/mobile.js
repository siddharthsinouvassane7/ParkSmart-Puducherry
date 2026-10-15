/* ParkSmart Mobile — phone-only UI glue: save files, print, smaller photos, Phone & Sync page. */
(function () {
  'use strict';
  var U = window.UI, h = U.h, icon = U.icon;
  var native = window.ParkNative || null;

  function saveFile(name, mime, text) {
    if (native && native.saveFile) { native.saveFile(name, mime || 'text/plain', text); return; }
    var b = new Blob([text], { type: mime || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    U.toast('Saved ' + name, 'ok');
  }
  function fetchAndSave(url, fallbackName) {
    return fetch(url).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) { var m; try { m = JSON.parse(t).error; } catch (e) { m = t; } throw new Error(m || ('Error ' + r.status)); }
        var cd = r.headers.get('Content-Disposition') || '', mm = /filename="([^"]+)"/.exec(cd);
        saveFile(mm ? mm[1] : fallbackName, (r.headers.get('Content-Type') || 'text/plain').split(';')[0], t);
      });
    }).catch(function (e) { U.toast(e.message, 'err'); });
  }
  // links to /api/... (e.g. Export CSV) are answered on the phone and saved as a file
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/api/"]');
    if (!a) return;
    e.preventDefault();
    fetchAndSave(a.getAttribute('href'), 'parksmart-export.csv');
  }, true);

  // smaller photos so many reports fit in phone storage
  var readFile = U.readFileAsDataUrl;
  U.readFileAsDataUrl = function (file, maxDim, q) { return readFile(file, Math.min(maxDim || 1000, 1000), Math.min(q || 0.72, 0.72)); };

  // print challan with Android's print service (Save as PDF works too)
  function printModal() {
    document.body.classList.add('printing-modal');
    if (native && native.print) {
      var hidden = false, done = function () { document.body.classList.remove('printing-modal'); document.removeEventListener('visibilitychange', vis); };
      var vis = function () { if (document.hidden) hidden = true; else if (hidden) setTimeout(done, 300); };
      document.addEventListener('visibilitychange', vis);
      setTimeout(done, 120000);
      native.print('ParkSmart challan');
    } else {
      setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printing-modal'); }, 300); }, 50);
    }
  }

  function viewSync(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('phone', 'lg') + ' Phone &amp; Sync</h2><span class="offline-badge"><span class="dot"></span>Works without laptop or Wi-Fi</span>' +
      '<div class="sub">ParkSmart Mobile runs the whole system inside this phone: parking, reports, police queue, challans, CCTV demo and analytics.</div></div>' +
      '<div class="grid g2"><div class="card"><h3>' + icon('upload') + ' Send this phone\'s reports to the laptop</h3><div id="syncInfo" class="muted">Loading…</div>' +
      '<ol class="small"><li>Tap <b>Save sync file</b> and save it (Downloads or Drive).</li><li>Send it to the laptop (WhatsApp to yourself, USB, Drive).</li><li>On the laptop: <b>Violation Reports → Import phone sync</b> and pick the file.</li></ol>' +
      '<p class="small muted">Reports already on the laptop are skipped, so you can sync again any time. Photos and their SHA-256 fingerprints go with the reports.</p>' +
      '<button class="btn primary" id="saveSync" style="width:100%;padding:12px">' + icon('download') + ' Save sync file</button></div>' +
      '<div class="card"><h3>' + icon('info') + ' About this phone app</h3><ul class="small"><li>Same rules engine as the laptop (forecast, priority, duplicates, congestion index, recommendations).</li>' +
      '<li>Data is stored on this phone. Maps load from the internet when available and switch to an offline map when not.</li>' +
      '<li>Logins: <b>admin / Admin@123</b>, <b>traffic / Officer@123</b>, <b>attendant / Lot@123</b>. Citizens need no login.</li>' +
      '<li>Report IDs made on this phone start with <b class="mono" id="pfx"></b> so they never clash with the laptop.</li></ul>' +
      '<div class="hr"></div><button class="btn danger" id="resetBtn">' + icon('refresh') + ' Reset demo data on this phone</button></div></div>';
    function info() {
      U.api('GET', '/api/mobile/info').then(function (r) {
        main.querySelector('#pfx').textContent = r.device + '…';
        main.querySelector('#syncInfo').innerHTML = '<div class="row"><div><div class="sync-num">' + r.reports + '</div><div class="small muted">reports made on this phone</div></div>' +
          '<div><div class="sync-num">' + r.withPhoto + '</div><div class="small muted">with photo</div></div><div><div class="sync-num">' + r.storageKB + '<span class="small"> KB</span></div><div class="small muted">phone storage used</div></div></div>';
      });
    }
    info();
    main.querySelector('#saveSync').onclick = function () { fetchAndSave('/api/mobile/sync', 'parksmart-sync.json').then(info); };
    main.querySelector('#resetBtn').onclick = function () {
      U.confirm('Reset demo data?', 'All reports and changes on this phone will be replaced with fresh demo data. Save a sync file first if you need them.', 'Reset').then(function (ok) { if (ok) U.api('POST', '/api/mobile/reset'); });
    };
  }

  window.PS_MOBILE = { saveFile: saveFile, printModal: printModal, viewSync: viewSync };
})();
