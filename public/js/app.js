/* ParkSmart Puducherry — front-end (PS-03: Smart Parking, Traffic Enforcement & Citizen Reporting) */
(function () {
  'use strict';
  var U = window.UI, h = U.h, icon = U.icon;
  var CENTER = [11.9345, 79.8280];
  var META = null;
  function meta() { return META ? Promise.resolve(META) : U.api('GET', '/api/meta').then(function (m) { META = m; return m; }); }
  var LV = { free: { label: 'Available', cls: 'green' }, busy: { label: 'Filling up', cls: 'amber' }, full: { label: 'Almost full', cls: 'red' }, closed: { label: 'Closed', cls: '' } };
  var ST = { 'New': 'blue', 'Verified': 'purple', 'Challan issued': 'green', 'Towed': 'green', 'Warned': 'amber', 'Rejected': '', 'Duplicate': '' };
  var SRC = { citizen: { label: 'Citizen', icon: 'users', cls: 'blue' }, camera: { label: 'CCTV', icon: 'cctv', cls: 'purple' }, officer: { label: 'Officer', icon: 'shield', cls: 'green' } };
  function stBadge(s) { return '<span class="badge ' + (ST[s] || '') + '">' + h(s) + '</span>'; }
  function srcBadge(s) { var x = SRC[s] || SRC.citizen; return '<span class="badge ' + x.cls + '">' + icon(x.icon) + ' ' + x.label + '</span>'; }
  function prBadge(p) { return '<span class="badge ' + (p === 'High' ? 'red' : p === 'Medium' ? 'amber' : '') + '">' + h(p || 'Normal') + '</span>'; }
  function dist(a, b, c, d) { var R = 6371000, t = Math.PI / 180, x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  function fmtDist(m) { return m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1) + ' km'; }
  function lvClass(pct) { return pct >= 0.9 ? 'full' : pct >= 0.7 ? 'busy' : 'free'; }
  function lotIcon(l, kind) {
    var free = kind === 'bike' ? l.free.bike : l.free.car;
    var pct = kind === 'bike' ? l.bpct : l.pct;
    var lv = l.status !== 'open' ? 'closed' : lvClass(pct);
    return L.divIcon({ className: 'leaflet-div-icon clean', iconSize: [0, 0], html: '<div class="lot-pin"><div class="b lv-' + lv + '">' + (l.status !== 'open' ? '✕' : free) + '<small>' + (kind === 'bike' ? '2W' : 'car') + ' free</small></div><div class="tail"></div></div>' });
  }
  function drawNoPark(map, m) {
    (m.noPark || []).forEach(function (z) {
      L.polyline(z.path, { color: '#b3261e', weight: 5, opacity: .75, dashArray: '8 6' }).addTo(map).bindTooltip('<b>No parking:</b> ' + h(z.name) + '<br><span class="small">' + h(z.reason) + '</span>');
    });
  }
  var myReportsKey = 'ps03-my-reports';
  function myReports() { try { return JSON.parse(U.lsGet(myReportsKey, '[]')) || []; } catch (e) { return []; } }

  // =====================================================================
  // CITIZEN: FIND PARKING
  // =====================================================================
  function viewFind(main) {
    var kind = U.lsGet('ps03-kind', 'car');
    var here = null, lots = [], selected = null, markers = {}, map, youMarker;
    main.innerHTML =
      '<div class="page-head"><h2>' + icon('parking', 'lg') + ' Find Parking</h2><span class="badge green"><span class="live-dot"></span>&nbsp;Live</span>' +
      '<div class="sub">Live free slots at authorised parking in Puducherry. Avoid fines — park only in authorised places.</div></div>' +
      '<div class="card"><div class="row">' +
      '<div class="seg" id="kindSeg"><button data-k="car">' + icon('car') + ' Car</button><button data-k="bike">' + icon('route') + ' Two-wheeler</button></div>' +
      '<select id="whereSel" style="flex:1;min-width:200px"><option value="">Where are you going?</option></select>' +
      '<button class="btn" id="gpsBtn">' + icon('target') + ' My location</button>' +
      '<button class="btn primary" id="nearestBtn" style="font-weight:700">' + icon('target') + ' Nearest free parking</button></div></div>' +
      '<div class="grid g-side"><div class="card" style="padding:8px"><div id="map" class="map tall"></div>' +
      '<div class="row small muted" style="padding:6px 4px 0"><span class="badge green">Available</span><span class="badge amber">Filling up</span><span class="badge red">Almost full</span><span style="display:inline-flex;align-items:center;gap:4px"><i style="display:inline-block;width:22px;border-top:3px dashed #b3261e"></i> No-parking stretch</span></div></div>' +
      '<div><div class="lot-list" id="lotList"></div></div></div>';
    var seg = main.querySelector('#kindSeg');
    function setKind(k) { kind = k; U.lsSet('ps03-kind', k); seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); }); paint(); }
    seg.querySelectorAll('button').forEach(function (b) { b.onclick = function () { setKind(b.dataset.k); }; });
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.k === kind); });

    map = U.makeMap(main.querySelector('#map'), CENTER, 15);
    meta().then(function (m) {
      drawNoPark(map, m);
      var sel = main.querySelector('#whereSel');
      m.landmarks.forEach(function (l, i) { sel.insertAdjacentHTML('beforeend', '<option value="' + i + '">' + h(l.name) + '</option>'); });
      sel.onchange = function () { if (sel.value === '') { here = null; } else { var l = m.landmarks[+sel.value]; here = { lat: l.lat, lng: l.lng, name: l.name }; map.setView([l.lat, l.lng], 16); } showYou(); paint(); };
    });
    main.querySelector('#gpsBtn').onclick = function () {
      if (!navigator.geolocation) return U.toast('Location not available on this device', 'err');
      navigator.geolocation.getCurrentPosition(function (p) {
        here = { lat: p.coords.latitude, lng: p.coords.longitude, name: 'You' };
        if (dist(here.lat, here.lng, CENTER[0], CENTER[1]) > 30000) { U.toast('You seem to be outside Puducherry — showing distances anyway'); }
        map.setView([here.lat, here.lng], 16); showYou(); paint();
      }, function () { U.toast('Phone browsers block GPS on local Wi-Fi links. Choose a place from the list instead.', 'err'); }, { timeout: 8000 });
    };
    // One tap: find the best authorised lot for this vehicle near the user — distance + free slots + 1-hour forecast.
    main.querySelector('#nearestBtn').onclick = function () {
      function pick() {
        var cands = lots.filter(function (l) { return l.status === 'open' && (kind === 'bike' ? l.free.bike : l.free.car) >= 3; });
        if (!cands.length) return U.toast('No lot has free ' + (kind === 'bike' ? 'two-wheeler' : 'car') + ' slots right now', 'err');
        cands.forEach(function (l) {
          var pct = kind === 'bike' ? l.bpct : l.pct, nxt = kind === 'bike' ? Math.min(1, l.bpct + (l.nextPct - l.pct)) : l.nextPct;
          l._d = dist(here.lat, here.lng, l.lat, l.lng);
          l._score = l._d + (nxt >= 0.95 ? 900 : nxt >= 0.85 ? 450 : 0) + (pct >= 0.85 ? 300 : 0);
          l._nxt = Math.round(nxt * 100);
        });
        cands.sort(function (a, b) { return a._score - b._score; });
        var b = cands[0], alt = cands[1], free = kind === 'bike' ? b.free.bike : b.free.car, mins = Math.max(1, Math.round(b._d / 250));
        selected = b.id; map.setView([b.lat, b.lng], 17); if (markers[b.id]) markers[b.id].openPopup(); paint();
        var m = U.modal('Best parking for you', '<div style="font-size:20px;font-weight:700">' + h(b.name) + '</div><div class="small muted">' + h(b.area) + ' · ' + h(b.type) + '</div>' +
          '<div class="grid g2" style="margin:12px 0;gap:8px"><div class="card" style="padding:10px;text-align:center"><div class="small muted">Distance</div><b style="font-size:20px">' + fmtDist(b._d) + '</b><div class="small muted">~' + mins + ' min drive</div></div>' +
          '<div class="card" style="padding:10px;text-align:center"><div class="small muted">Free ' + (kind === 'bike' ? 'two-wheeler' : 'car') + ' slots</div><b style="font-size:20px;color:var(--green)">' + free + '</b><div class="small muted">₹' + (kind === 'bike' ? b.rate.bike : b.rate.car) + '/hr</div></div></div>' +
          '<div class="note ' + (b._nxt >= 85 ? 'warn' : 'green') + ' small">In 1 hour this lot will be about <b>' + b._nxt + '% full</b>' + (b._nxt >= 85 ? ' — go now.' : ' — you will find a slot.') + '</div>' +
          (alt ? '<div class="small muted" style="margin-top:8px">Next option: <b>' + h(alt.name) + '</b> (' + fmtDist(alt._d) + ', ' + (kind === 'bike' ? alt.free.bike : alt.free.car) + ' free)</div>' : '') +
          '<div class="btn-row" style="margin-top:12px"><a class="btn primary" style="flex:1;justify-content:center;padding:12px" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng + '">' + icon('route') + ' Navigate now</a></div>' +
          '<div class="small muted" style="margin-top:8px">Chosen by distance, live free slots and the 1-hour demand forecast. Park only in authorised lots — avoid fines.</div>', { icon: 'parking' });
      }
      if (here) return pick();
      if (!navigator.geolocation) return U.toast('Choose "Where are you going?" first', 'err');
      U.toast('Finding your location…');
      navigator.geolocation.getCurrentPosition(function (p) {
        here = { lat: p.coords.latitude, lng: p.coords.longitude, name: 'You' };
        if (dist(here.lat, here.lng, CENTER[0], CENTER[1]) > 30000) { here = { lat: CENTER[0], lng: CENTER[1], name: 'Town centre' }; U.toast('You are outside Puducherry — using the town centre'); }
        showYou(); pick();
      }, function () { U.toast('GPS not available here. Choose "Where are you going?" from the list, then tap again.', 'err'); }, { timeout: 8000, maximumAge: 60000 });
    };
    function showYou() {
      if (youMarker) { map.removeLayer(youMarker); youMarker = null; }
      if (here) youMarker = L.marker([here.lat, here.lng], { icon: L.divIcon({ className: 'leaflet-div-icon clean', iconSize: [0, 0], html: '<div style="transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#1d5fbf;border:3px solid #fff;box-shadow:0 0 0 6px rgba(29,95,191,.25)"></div>' }) }).addTo(map).bindTooltip(h(here.name));
    }
    function paint() {
      var list = lots.slice();
      list.forEach(function (l) { l._d = here ? dist(here.lat, here.lng, l.lat, l.lng) : null; });
      if (here) list.sort(function (a, b) { return a._d - b._d; });
      else list.sort(function (a, b) { return (kind === 'bike' ? b.free.bike - a.free.bike : b.free.car - a.free.car); });
      var box = main.querySelector('#lotList');
      box.innerHTML = list.map(function (l) {
        var free = kind === 'bike' ? l.free.bike : l.free.car, cap = kind === 'bike' ? l.cap.bike : l.cap.car, pct = kind === 'bike' ? l.bpct : l.pct;
        var lv = l.status !== 'open' ? 'closed' : lvClass(pct);
        var nxt = Math.round((kind === 'bike' ? Math.min(1, l.bpct + (l.nextPct - l.pct)) : l.nextPct) * 100);
        return '<div class="lot ' + (selected === l.id ? 'sel' : '') + '" data-id="' + l.id + '"><div class="top"><div><div class="name">' + h(l.name) + '</div><div class="small muted">' + h(l.area) + ' · ' + h(l.type) + '</div></div>' +
          '<div class="free"><b style="color:var(--' + (lv === 'free' ? 'green' : lv === 'busy' ? 'amber' : 'red') + ')">' + (l.status !== 'open' ? '—' : free) + '</b><span>of ' + cap + ' free</span></div></div>' +
          '<div class="bar"><i class="' + lv + '-c" style="width:' + Math.round(pct * 100) + '%"></i></div>' +
          '<div class="meta"><span>' + (l._d != null ? icon('pin') + ' ' + fmtDist(l._d) : '<span class="badge ' + (LV[lv] || {}).cls + '">' + (LV[lv] || {}).label + '</span>') + '</span><span>' + icon('rupee') + ' ' + (kind === 'bike' ? l.rate.bike : l.rate.car) + '/hr</span><span>' + icon('clock') + ' ' + h(l.hours) + '</span>' +
          (l.status === 'open' ? '<span>' + icon('trend') + ' In 1 hr: ~' + nxt + '% full</span>' : '') + '</div>' +
          (l.features.length ? '<div class="small muted">' + l.features.map(h).join(' · ') + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px"><a class="btn sm primary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + l.lat + ',' + l.lng + '">' + icon('route') + ' Navigate</a><button class="btn sm" data-best="' + l.id + '">' + icon('chart') + ' Best time today</button></div></div>';
      }).join('');
      box.querySelectorAll('.lot').forEach(function (el) {
        el.onclick = function (e) { if (e.target.closest('a,button')) return; selected = el.dataset.id; var l = lots.find(function (x) { return x.id === selected; }); map.setView([l.lat, l.lng], 17); markers[l.id].openPopup(); paint(); };
      });
      box.querySelectorAll('[data-best]').forEach(function (b) { b.onclick = function () { bestTime(lots.find(function (x) { return x.id === b.dataset.best; })); }; });
      lots.forEach(function (l) {
        var pop = '<b>' + h(l.name) + '</b><br>' + l.free.car + ' car / ' + l.free.bike + ' two-wheeler slots free<br>₹' + l.rate.car + '/hr car · ' + h(l.hours);
        if (!markers[l.id]) markers[l.id] = L.marker([l.lat, l.lng], { icon: lotIcon(l, kind) }).addTo(map).bindPopup(pop);
        else { markers[l.id].setIcon(lotIcon(l, kind)); markers[l.id].setPopupContent(pop); }
      });
    }
    function load() { U.api('GET', '/api/lots').then(function (r) { lots = r; paint(); }); }
    load();
    U.on('occ', function (upd) {
      upd.forEach(function (u) {
        var l = lots.find(function (x) { return x.id === u.id; }); if (!l) return;
        l.occ.car = u.car; l.occ.bike = u.bike; l.free.car = l.cap.car - u.car; l.free.bike = l.cap.bike - u.bike;
        var d = l.nextPct - l.pct; l.pct = u.car / (l.cap.car || 1); l.bpct = u.bike / (l.cap.bike || 1); l.nextPct = Math.max(0, Math.min(1, l.pct + d));
      });
      if (main.isConnected) paint();
    });
  }
  function bestTime(l) {
    U.api('GET', '/api/lots/' + l.id + '/forecast').then(function (f) {
      var m = U.modal('Best time to park — ' + l.name, '<p class="small muted">Expected occupancy by hour today (from past demand pattern).</p><div class="chart-box"><canvas id="bt"></canvas></div>' +
        '<div class="note green" style="margin-top:10px">' + icon('clock') + ' Easiest time to find a slot today: <b>' + String(f.best).padStart(2, '0') + ':00 – ' + String(f.best + 1).padStart(2, '0') + ':00</b> (about ' + f.hours[f.best] + '% full)</div>', { icon: 'chart' });
      var colors = f.hours.map(function (v, i) { return i === f.nowHour ? U.cssVar('--brand-2') : v >= 90 ? U.cssVar('--red') : v >= 70 ? U.cssVar('--amber') : U.cssVar('--green'); });
      U.chart(m.querySelector('#bt'), { type: 'bar', data: { labels: f.hours.map(function (_, i) { return i + ':00'; }), datasets: [{ label: '% full', data: f.hours, backgroundColor: colors }] }, options: { plugins: { legend: { display: false } }, scales: { y: { max: 100, beginAtZero: true } } } });
    });
  }

  // =====================================================================
  // CITIZEN: REPORT A VIOLATION
  // =====================================================================
  function viewReport(main) {
    var st = { photo: null, lat: null, lng: null, type: null };
    main.innerHTML = '<div class="page-head"><h2>' + icon('camera', 'lg') + ' Report a Parking Violation</h2><div class="sub">Help keep Puducherry roads clear. Your report goes straight to the Traffic Police. No login needed.</div></div>' +
      '<div class="grid g2"><div>' +
      '<div class="card"><h3><span class="step-n">1</span> Photo of the vehicle</h3><label class="photo-drop" id="drop"><input type="file" accept="image/*" capture="environment" id="photoIn" hidden><div id="photoPrev">' + icon('camera', 'xl') + '<div>Tap to take or choose a photo</div><div class="small muted">Show the number plate if you can do it safely</div></div></label><div id="ocrSt" class="ocr-status" style="display:none"></div></div>' +
      '<div class="card"><h3><span class="step-n">2</span> What is the problem?</h3><div class="type-grid" id="types"></div>' +
      '<div class="grid g2" style="margin-top:10px"><label class="f">Vehicle type<select id="veh"><option>Car</option><option>Two-wheeler</option><option>Auto</option><option>Van</option><option>Truck</option><option>Bus</option></select></label>' +
      '<label class="f">Vehicle number (optional)<input type="text" id="plate" placeholder="PY01AB1234" autocapitalize="characters"></label></div>' +
      '<label class="f">Details (optional)<textarea id="desc" placeholder="e.g. Blocking the hospital gate for 30 minutes"></textarea></label></div>' +
      '</div><div>' +
      '<div class="card"><h3><span class="step-n">3</span> Where is it?</h3><p class="small muted" style="margin-top:0">Tap the exact spot on the map, or pick a nearby place.</p>' +
      '<div class="row" style="margin-bottom:8px"><select id="lm" style="flex:1"><option value="">Nearby place…</option></select><button class="btn" id="gps">' + icon('target') + ' My location</button></div>' +
      '<div id="rmap" class="map" style="height:340px"></div><div class="small muted" id="locTxt" style="margin-top:6px">No location chosen yet</div></div>' +
      '<div class="card"><label class="f">Your mobile number (optional, for updates only — never shown)<input type="tel" id="contact" placeholder="98xxxxxxxx"></label>' +
      '<div class="note warn small">' + icon('alert') + ' False reports waste police time. Do not stand in traffic to take photos.</div>' +
      '<button class="btn primary" id="submit" style="width:100%;margin-top:10px;padding:12px">' + icon('send') + ' Submit report</button></div>' +
      '</div></div>';
    var map = U.makeMap(main.querySelector('#rmap'), CENTER, 15), mk = null;
    if (window.PlateOCR) PlateOCR.warm();
    function setLoc(lat, lng) {
      st.lat = lat; st.lng = lng;
      if (mk) mk.setLatLng([lat, lng]); else mk = L.marker([lat, lng], { draggable: true }).addTo(map).on('dragend', function (e) { var p = e.target.getLatLng(); setLoc(p.lat, p.lng); });
      main.querySelector('#locTxt').innerHTML = icon('pin') + ' ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + ' <span class="muted">(drag the pin to adjust)</span>';
    }
    map.on('click', function (e) { setLoc(e.latlng.lat, e.latlng.lng); });
    meta().then(function (m) {
      drawNoPark(map, m);
      var tg = main.querySelector('#types');
      tg.innerHTML = m.vtypes.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + h(t.type) + '</button>'; }).join('');
      tg.querySelectorAll('button').forEach(function (b) { b.onclick = function () { st.type = m.vtypes[+b.dataset.i].type; tg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      var lm = main.querySelector('#lm');
      m.landmarks.forEach(function (l, i) { lm.insertAdjacentHTML('beforeend', '<option value="' + i + '">' + h(l.name) + '</option>'); });
      lm.onchange = function () { if (lm.value === '') return; var l = m.landmarks[+lm.value]; map.setView([l.lat, l.lng], 17); setLoc(l.lat, l.lng); };
    });
    main.querySelector('#gps').onclick = function () {
      if (!navigator.geolocation) return U.toast('Location not available', 'err');
      navigator.geolocation.getCurrentPosition(function (p) { map.setView([p.coords.latitude, p.coords.longitude], 17); setLoc(p.coords.latitude, p.coords.longitude); },
        function () { U.toast('GPS blocked on this link — tap the map instead.', 'err'); }, { timeout: 8000, enableHighAccuracy: true });
    };
    main.querySelector('#photoIn').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      U.readFileAsDataUrl(f, 1600, 0.85).then(function (d) {
        st.photo = d;
        main.querySelector('#photoPrev').innerHTML = '<img src="' + d + '" alt="photo"><div class="small muted" style="margin-top:6px">' + (window.PlateOCR && PlateOCR.available() ? 'Tap the number plate in the photo to read it again · tap here to change the photo' : 'Tap to change') + '</div>';
        if (window.PlateOCR) PlateOCR.attach({ img: main.querySelector('#photoPrev img'), input: main.querySelector('#plate'), status: main.querySelector('#ocrSt') });
      }).catch(function (er) { U.toast(er.message, 'err'); });
    };
    main.querySelector('#submit').onclick = function () {
      if (!st.type) return U.toast('Choose what the problem is (step 2)', 'err');
      if (st.lat == null) return U.toast('Tap the map to mark the location (step 3)', 'err');
      var btn = this; btn.disabled = true;
      U.api('POST', '/api/report', { type: st.type, lat: st.lat, lng: st.lng, photo: st.photo, plate: main.querySelector('#plate').value, plateOcr: main.querySelector('#plate').getAttribute('data-ocr'), vehicle: main.querySelector('#veh').value, desc: main.querySelector('#desc').value, contact: main.querySelector('#contact').value })
        .then(function (r) {
          var mine = myReports(); mine.unshift({ id: r.id, at: new Date().toISOString(), type: st.type }); U.lsSet(myReportsKey, JSON.stringify(mine.slice(0, 20)));
          var link = location.origin + '/#/track/' + r.id;
          main.innerHTML = '<div class="card center" style="max-width:520px;margin:20px auto">' + icon('shieldcheck', 'xl') + '<h2>Report received</h2><p>Your report ID</p><div class="big-id">' + h(r.id) + '</div>' +
            '<p class="small muted">Location: ' + h(r.place) + ' · Priority: ' + h(r.priority) + '</p>' +
            (r.dupOf ? '<div class="note small">Someone has already reported this spot (' + h(r.dupOf) + '). Your report has been linked to it.</div>' : '') +
            '<div style="background:#fff;display:inline-block;padding:8px;border-radius:8px;margin:10px 0">' + U.qrSvg(link, 4) + '</div><p class="small muted">Scan or save this to track the status.</p>' +
            '<div class="btn-row" style="justify-content:center"><a class="btn primary" href="#/track/' + h(r.id) + '">' + icon('eye') + ' Track status</a><a class="btn" href="#/report" onclick="setTimeout(function(){UI.render()},10)">' + icon('plus') + ' New report</a></div></div>';
          U.toast('Report ' + r.id + ' sent to Traffic Police', 'ok');
        }).catch(function (e) { U.toast(e.message, 'err'); btn.disabled = false; });
    };
  }

  // =====================================================================
  // CITIZEN: TRACK
  // =====================================================================
  function viewTrack(main, args) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('eye', 'lg') + ' Track my report</h2></div>' +
      '<div class="card" style="max-width:640px"><form class="row" id="tf"><input type="text" id="tid" placeholder="Report ID e.g. V01234" style="flex:1;text-transform:uppercase" value="' + h(args[0] || '') + '"><button class="btn primary">' + icon('search') + ' Track</button></form><div id="tres" style="margin-top:12px"></div></div>' +
      '<div class="card" style="max-width:640px"><h3>' + icon('history') + ' Reports from this phone</h3><div id="mine"></div></div>';
    var mine = myReports();
    main.querySelector('#mine').innerHTML = mine.length ? mine.map(function (m) { return '<div class="feed-item" data-id="' + h(m.id) + '"><b class="mono">' + h(m.id) + '</b><span>' + h(m.type) + '</span><span class="muted small" style="margin-left:auto">' + U.ago(m.at) + '</span></div>'; }).join('') : '<div class="empty small">No reports sent from this phone yet.</div>';
    main.querySelectorAll('#mine [data-id]').forEach(function (el) { el.onclick = function () { main.querySelector('#tid').value = el.dataset.id; look(); }; });
    function look() {
      var id = main.querySelector('#tid').value.trim().toUpperCase(); if (!id) return;
      U.api('GET', '/api/track/' + encodeURIComponent(id)).then(function (r) {
        var done = ['Challan issued', 'Towed', 'Warned'].indexOf(r.status) >= 0;
        main.querySelector('#tres').innerHTML = '<div class="row"><span class="big-id" style="font-size:24px">' + h(r.id) + '</span>' + stBadge(r.status) + '</div>' +
          '<p>' + h(r.type) + ' · ' + h(r.place) + (r.plate ? ' · <span class="mono">' + h(r.plate) + '</span>' : '') + '<br><span class="small muted">' + U.fmtDateTime(r.ts) + '</span></p>' +
          (done ? '<div class="note green">' + icon('check') + ' Action taken by Traffic Police. Thank you for helping!</div>' : r.status === 'Rejected' ? '<div class="note">The officer could not confirm this violation on the spot.</div>' : '') +
          '<ul class="timeline" style="margin-top:10px">' + r.history.map(function (x) { return '<li><b>' + h(x.action) + '</b><br><span class="small muted">' + U.fmtDateTime(x.at) + (x.remarks ? ' — ' + h(x.remarks) : '') + '</span></li>'; }).join('') + '</ul>';
      }).catch(function (e) { main.querySelector('#tres').innerHTML = '<div class="note red">' + h(e.message) + '</div>'; });
    }
    main.querySelector('#tf').onsubmit = function (e) { e.preventDefault(); look(); };
    if (args[0]) look();
  }

  // =====================================================================
  // POLICE: DASHBOARD
  // =====================================================================
  function viewDash(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('dashboard', 'lg') + ' Traffic Command Dashboard</h2><span class="badge green"><span class="live-dot"></span>&nbsp;Live</span>' +
      '<div class="actions" id="dashAct"></div><div class="sub">Parking occupancy, violation reports and recommended action — updates every few seconds.</div></div><div id="dashBody"><div class="empty">Loading…</div></div>';
    var map, lotMk = {}, violLayer, hourlyChart;
    function kpi(cls, ic, v, l) { return '<div class="card kpi ' + cls + '"><div class="ico">' + icon(ic, 'lg') + '</div><div><div class="v">' + v + '</div><div class="l">' + l + '</div></div></div>'; }
    function load(first) {
      Promise.all([U.api('GET', '/api/dashboard'), U.api('GET', '/api/lots'), meta()]).then(function (res) {
        var d = res[0], lots = res[1], m = res[2], k = d.kpi;
        if (!main.isConnected) return;
        var act = main.querySelector('#dashAct');
        act.innerHTML = (U.state.user.role === 'admin' ? '<button class="btn sm" id="simBtn">' + icon('cpu') + ' Sensor simulation: ' + (d.sim ? 'ON' : 'OFF') + '</button>' : '') + '<button class="btn sm" id="refBtn">' + icon('refresh') + ' Refresh</button>';
        if (act.querySelector('#simBtn')) act.querySelector('#simBtn').onclick = function () { U.apiSafe('POST', '/api/sim', { on: !d.sim }).then(function () { load(); }); };
        act.querySelector('#refBtn').onclick = function () { load(); };
        var body = main.querySelector('#dashBody');
        if (first) {
          body.innerHTML =
            '<div class="grid g4" id="kpis"></div><div class="grid g-side" style="margin-top:14px;align-items:start">' +
            '<div class="card" style="padding:8px"><div class="row" style="padding:2px 6px 8px"><h3 style="margin:0">' + icon('map') + ' Live city view</h3><span class="small muted" style="margin-left:auto">Pins = free car slots · red dots = open reports</span></div><div id="dmap" class="map"></div></div>' +
            '<div><div class="card"><h3>' + icon('layers') + ' Zone congestion index</h3><div id="zones"></div><p class="tiny muted" style="margin:6px 0 0">Index = 60% parking occupancy + 40% violations in last 2 hours.</p></div>' +
            '<div class="card"><h3>' + icon('bell') + ' Live reports</h3><div id="feed"></div><a class="btn sm" href="#/reports" style="margin-top:8px">' + icon('list') + ' Open the queue</a></div></div></div>' +
            '<div class="grid g2"><div class="card"><h3>' + icon('sparkle') + ' Recommended actions</h3><div id="recs"></div></div><div class="card"><h3>' + icon('chart') + ' Reports by hour (today)</h3><div class="chart-box"><canvas id="hourly"></canvas></div></div></div>';
          map = U.makeMap(body.querySelector('#dmap'), CENTER, 14);
          drawNoPark(map, m);
          violLayer = L.layerGroup().addTo(map);
        }
        body.querySelector('#kpis').innerHTML =
          kpi('green', 'car', U.num(k.freeCar), 'Free car slots (of ' + U.num(k.capCar) + ')') + kpi('green', 'route', U.num(k.freeBike), 'Free two-wheeler slots') +
          kpi('red', 'parking', k.fullLots, 'Lots ≥ 90% full') + kpi('', 'flag', k.reportsToday, 'Reports today (' + k.citizenShare + '% by citizens, 7d)') +
          kpi('amber', 'bell', k.open, 'Open reports to act on') + kpi('purple', 'gavel', k.challansToday, 'Challans / tows today') +
          kpi('green', 'rupee', U.fmtINR(k.finesToday), 'Fines issued today') + kpi('', 'clock', k.medianResp != null ? k.medianResp + ' min' : '—', 'Median response time (7d)');
        body.querySelector('#zones').innerHTML = d.zones.map(function (z) {
          var c = z.level === 'Severe' ? 'red' : z.level === 'High' ? 'amber' : z.level === 'Moderate' ? 'blue' : 'green';
          return '<div class="zone-row"><div><b>' + h(z.zone) + '</b><div class="tiny muted">' + Math.round(z.pct * 100) + '% parked · ' + z.active + ' reports (2h)</div><div class="bar" style="margin-top:3px"><i style="width:' + z.index + '%;background:var(--' + (c === 'blue' ? 'blue' : c) + ')"></i></div></div><div class="right"><b style="font-size:20px">' + z.index + '</b></div><div class="right"><span class="badge ' + c + '">' + z.level + '</span></div></div>';
        }).join('');
        body.querySelector('#recs').innerHTML = d.recs.map(function (r) {
          var ic = { tow: 'tow', patrol: 'shield', capacity: 'parking', signage: 'flag' }[r.kind] || 'info';
          var c = r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'amber' : 'blue';
          return '<div class="rec"><div class="ri" style="background:var(--' + c + '-bg);color:var(--' + c + ')">' + icon(ic, 'lg') + '</div><div><b>' + h(r.title) + '</b> ' + prBadge(r.priority) + '<div class="small">' + h(r.text) + '</div></div></div>';
        }).join('') || '<div class="empty">No actions needed right now.</div>';
        feed(d.recent);
        lots.forEach(function (l) {
          var pop = '<b>' + h(l.name) + '</b><br>Car: ' + l.occ.car + '/' + l.cap.car + ' · 2W: ' + l.occ.bike + '/' + l.cap.bike;
          if (!lotMk[l.id]) lotMk[l.id] = L.marker([l.lat, l.lng], { icon: lotIcon(l, 'car') }).addTo(map).bindPopup(pop);
          else { lotMk[l.id].setIcon(lotIcon(l, 'car')); lotMk[l.id].setPopupContent(pop); }
        });
        violLayer.clearLayers();
        d.openList.forEach(function (v) {
          L.marker([v.lat, v.lng], { icon: L.divIcon({ className: 'leaflet-div-icon clean', iconSize: [0, 0], html: '<div class="pulse-dot" style="transform:translate(-50%,-50%);background:' + (v.priority === 'High' ? '#b3261e' : '#b86e00') + '"></div>' }) })
            .addTo(violLayer).bindPopup('<b>' + h(v.id) + '</b> ' + h(v.type) + '<br>' + h(v.place) + '<br>' + U.ago(v.ts) + '<br><a href="#/reports/' + v.id + '">Open</a>');
        });
        if (hourlyChart) hourlyChart.destroy();
        hourlyChart = U.chart(body.querySelector('#hourly'), { type: 'bar', data: { labels: d.hourly.map(function (_, i) { return i + ':00'; }), datasets: [{ label: 'Reports', data: d.hourly, backgroundColor: U.cssVar('--brand-2') }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
      }).catch(function (e) { U.toast(e.message, 'err'); });
    }
    function feed(items) {
      var el = main.querySelector('#feed'); if (!el) return;
      el.innerHTML = items.slice(0, 7).map(function (v, i) {
        return '<div class="feed-item" data-id="' + v.id + '">' + srcBadge(v.source) + '<div style="flex:1;min-width:0"><b>' + h(v.type) + '</b><div class="tiny muted">' + h(v.id) + ' · ' + h(v.place) + ' · ' + U.ago(v.ts) + '</div></div>' + stBadge(v.status) + '</div>';
      }).join('');
      el.querySelectorAll('[data-id]').forEach(function (x) { x.onclick = function () { openViolation(x.dataset.id); }; });
    }
    load(true);
    var t = setInterval(function () { if (!main.isConnected) return clearInterval(t); load(); }, 20000);
    U.on('viol', function (v) { if (!v.update) { U.toast('New ' + (v.source === 'camera' ? 'CCTV detection' : 'report') + ': ' + v.type + ' — ' + v.place); } load(); });
  }

  // =====================================================================
  // POLICE: REPORTS QUEUE
  // =====================================================================
  function viewReports(main, args) {
    var f = { status: 'open', type: '', source: '', zone: '', days: 7, q: '' };
    main.innerHTML = '<div class="page-head"><h2>' + icon('list', 'lg') + ' Violation Reports</h2><div class="actions"><button class="btn sm" id="newV">' + icon('plus') + ' Log violation</button><a class="btn sm" id="csv" href="/api/export.csv?days=30">' + icon('download') + ' Export CSV</a>' + (window.PS_MOBILE ? '' : '<label class="btn sm" title="Add reports recorded on ParkSmart Mobile">' + icon('upload') + ' Import phone sync<input type="file" id="syncIn" accept=".json,.txt,application/json,text/plain" hidden></label>') + '</div><div class="sub">Citizen reports, CCTV detections and officer entries in one queue. Click a row to act.</div></div>' +
      '<div class="card"><div class="row" id="filters"></div></div><div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Time</th><th>Violation</th><th>Place</th><th>Vehicle</th><th>Source</th><th>Priority</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div><div class="small muted" id="cnt" style="padding:8px 12px"></div></div>';
    meta().then(function (m) {
      var fl = main.querySelector('#filters');
      fl.innerHTML = '<select data-k="status"><option value="open">Open (new + verified)</option><option value="">All statuses</option>' + ['New', 'Verified', 'Challan issued', 'Towed', 'Warned', 'Rejected', 'Duplicate'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
        '<select data-k="type"><option value="">All violation types</option>' + m.vtypes.map(function (t) { return '<option>' + h(t.type) + '</option>'; }).join('') + '</select>' +
        '<select data-k="source"><option value="">All sources</option><option value="citizen">Citizen</option><option value="camera">CCTV</option><option value="officer">Officer</option></select>' +
        '<select data-k="zone"><option value="">All zones</option>' + ['Central Market', 'White Town', 'Transit Hub', 'North', 'South', 'Other'].map(function (z) { return '<option>' + z + '</option>'; }).join('') + '</select>' +
        '<select data-k="days"><option value="1">Last 24 hours</option><option value="7" selected>Last 7 days</option><option value="30">Last 30 days</option><option value="60">Last 60 days</option></select>' +
        '<input type="search" data-k="q" placeholder="Search ID / vehicle no. / place" style="flex:1;min-width:180px">';
      fl.querySelectorAll('[data-k]').forEach(function (el) { el.oninput = el.onchange = function () { f[el.dataset.k] = el.value; load(); }; });
      load();
    });
    main.querySelector('#newV').onclick = function () { logViolation(load); };
    var syncIn = main.querySelector('#syncIn');
    if (syncIn) syncIn.onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var data; try { data = JSON.parse(fr.result); } catch (er) { return U.toast('That file is not a ParkSmart sync file', 'err'); }
        U.apiSafe('POST', '/api/import-sync', { data: data }).then(function (r) { U.toast(r.added + ' report(s) added from phone' + (r.skipped ? ', ' + r.skipped + ' already here' : '') + (r.invalid ? ', ' + r.invalid + ' invalid' : ''), 'ok'); load(); });
        syncIn.value = '';
      };
      fr.readAsText(f);
    };
    function load() {
      var qs = Object.keys(f).filter(function (k) { return f[k] !== ''; }).map(function (k) { return k + '=' + encodeURIComponent(f[k]); }).join('&');
      U.api('GET', '/api/violations?' + qs).then(function (r) {
        if (!main.isConnected) return;
        main.querySelector('#rows').innerHTML = r.items.map(function (v) {
          return '<tr class="click" data-id="' + v.id + '"><td class="mono">' + h(v.id) + (v.dupOf ? ' <span class="badge" title="Possible duplicate">dup?</span>' : '') + '</td><td class="small">' + U.fmtDateTime(v.ts) + '</td><td>' + h(v.type) + '</td><td class="small">' + h(v.place) + '</td><td class="mono">' + h(v.plate || '—') + '<div class="tiny muted">' + h(v.vehicle) + '</div></td><td>' + srcBadge(v.source) + '</td><td>' + prBadge(v.priority) + '</td><td>' + stBadge(v.status) + '</td></tr>';
        }).join('') || '<tr><td colspan="8" class="empty">No reports match these filters.</td></tr>';
        main.querySelector('#cnt').textContent = r.total + ' report(s)' + (r.total > r.items.length ? ' — showing first ' + r.items.length : '');
        main.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.onclick = function () { openViolation(tr.dataset.id, load); }; });
      });
    }
    U.on('viol', function () { load(); });
    if (args[0]) openViolation(args[0], load);
  }
  function logViolation(after) {
    meta().then(function (m) {
      var md = U.modal('Log a violation (officer)', '<label class="f">Violation<select id="lt">' + m.vtypes.map(function (t) { return '<option>' + h(t.type) + '</option>'; }).join('') + '</select></label>' +
        '<div class="grid g2"><label class="f">Vehicle number<input type="text" id="lp" placeholder="PY01AB1234"></label><label class="f">Vehicle type<select id="lv"><option>Car</option><option>Two-wheeler</option><option>Auto</option><option>Van</option><option>Truck</option></select></label></div>' +
        '<label class="f">Photo (optional — the number plate is read automatically)<input type="file" accept="image/*" capture="environment" id="lph"></label><div id="lphPrev" class="ocr-prev"></div><div id="lOcr" class="ocr-status" style="display:none"></div>' +
        '<p class="small muted" style="margin:0 0 6px">Tap the map for the location:</p><div id="lmap" class="map" style="height:260px"></div>',
        { icon: 'plus', footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-s>' + icon('check') + ' Save</button>' });
      var map = U.makeMap(md.querySelector('#lmap'), CENTER, 15), mk = null, loc = null, photo = null;
      drawNoPark(map, m);
      map.on('click', function (e) { loc = e.latlng; if (mk) mk.setLatLng(loc); else mk = L.marker(loc).addTo(map); });
      md.querySelector('#lph').onchange = function (e) {
        var fl = e.target.files[0]; if (!fl) return;
        U.readFileAsDataUrl(fl, 1600, .85).then(function (d) {
          photo = d;
          md.querySelector('#lphPrev').innerHTML = '<img src="' + d + '" alt="photo">';
          if (window.PlateOCR) PlateOCR.attach({ img: md.querySelector('#lphPrev img'), input: md.querySelector('#lp'), status: md.querySelector('#lOcr') });
        });
      };
      if (window.PlateOCR) PlateOCR.warm();
      md.querySelector('[data-c]').onclick = function () { md.close(); };
      md.querySelector('[data-s]').onclick = function () {
        if (!loc) return U.toast('Tap the map to set the location', 'err');
        U.apiSafe('POST', '/api/violations', { source: 'officer', type: md.querySelector('#lt').value, plate: md.querySelector('#lp').value, plateOcr: md.querySelector('#lp').getAttribute('data-ocr'), vehicle: md.querySelector('#lv').value, lat: loc.lat, lng: loc.lng, photo: photo })
          .then(function (v) { md.close(); U.toast('Logged ' + v.id, 'ok'); if (after) after(); openViolation(v.id, after); });
      };
    });
  }
  function openViolation(id, after) {
    U.api('GET', '/api/violations/' + id).then(function (v) {
      var open = v.status === 'New' || v.status === 'Verified';
      var html = '<div class="grid g2"><div><div class="photo-box">' + (v.photo ? '<img src="' + h(v.photo) + '" alt="evidence">' : '<div class="center">' + icon(v.source === 'camera' ? 'cctv' : 'camera', 'xl') + '<div class="small">No photo attached</div></div>') + '</div>' +
        (v.photoHash ? '<div class="tiny muted mono" style="margin-top:4px;word-break:break-all">' + icon('hash') + ' SHA-256: ' + h(v.photoHash) + '</div>' : '') +
        '<div class="small" style="margin-top:8px"><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + v.lat + ',' + v.lng + '">' + icon('pin') + ' ' + v.lat + ', ' + v.lng + '</a></div></div>' +
        '<div><dl class="det-grid"><dt>Status</dt><dd>' + stBadge(v.status) + ' ' + prBadge(v.priority) + '</dd><dt>Violation</dt><dd><b>' + h(v.type) + '</b></dd><dt>Vehicle</dt><dd class="mono">' + h(v.plate || 'Not given') + ' <span class="muted">(' + h(v.vehicle) + ')</span>' + (v.plateOcr != null && v.plate ? ' <span class="badge purple" title="Number read automatically from the photo">' + icon('camera') + ' OCR ' + v.plateOcr + '%</span>' : '') + '</dd>' +
        '<dt>Place</dt><dd>' + h(v.place) + '</dd><dt>Zone / unit</dt><dd>' + h(v.zone) + ' · ' + h(v.unit) + '</dd><dt>Reported</dt><dd>' + U.fmtDateTime(v.ts) + ' (' + U.ago(v.ts) + ')</dd><dt>Source</dt><dd>' + srcBadge(v.source) + (v.cameraId ? ' <span class="mono small">' + h(v.cameraId) + '</span>' : '') + '</dd>' +
        (v.desc ? '<dt>Details</dt><dd>' + h(v.desc) + '</dd>' : '') + (v.fine ? '<dt>Fine</dt><dd><b>₹' + v.fine + '</b> ' + (v.paid ? '<span class="badge green">Paid</span>' : '<span class="badge red">Unpaid</span>') + '</dd>' : '') + '</dl>' +
        (v.dupOf ? '<div class="note warn small" style="margin-top:8px">' + icon('copy') + ' Possible duplicate of <a href="#" data-open="' + h(v.dupOf) + '">' + h(v.dupOf) + '</a> (same spot / vehicle within 30 min).</div>' : '') +
        (v.prior.length ? '<div class="note ' + (v.prior.length >= 3 ? 'red' : 'warn') + ' small" style="margin-top:8px">' + icon('alert') + ' <b>Repeat offender:</b> this vehicle has ' + v.prior.length + ' earlier report(s), unpaid ₹' + v.prior.reduce(function (s, p) { return s + (p.fine && !p.paid ? p.fine : 0); }, 0) + '.</div>' : '') +
        '</div></div>' +
        (open ? '<div class="card" style="margin-top:12px;background:var(--surface-2)"><h4>' + icon('gavel') + ' Take action</h4><div class="grid g2"><label class="f">Vehicle number<input type="text" id="aPlate" value="' + h(v.plate) + '" placeholder="PY01AB1234"></label><label class="f">Fine (₹)<input type="number" id="aFine" value="' + v.fineDefault + '"></label></div>' +
          '<label class="f">Remarks<input type="text" id="aRem" placeholder="Required for reject"></label><div class="btn-row">' +
          (v.status === 'New' ? '<button class="btn" data-a="verify">' + icon('eye') + ' Verified on spot</button>' : '') +
          '<button class="btn primary" data-a="challan">' + icon('gavel') + ' Issue challan</button><button class="btn warn" data-a="tow">' + icon('tow') + ' Tow (+₹500)</button><button class="btn" data-a="warn">' + icon('alert') + ' Warn only</button><button class="btn" data-a="duplicate">' + icon('copy') + ' Duplicate</button><button class="btn danger" data-a="reject">' + icon('x') + ' Reject</button></div></div>' : '') +
        '<div class="grid g2" style="margin-top:12px"><div><h4>' + icon('history') + ' History</h4><ul class="timeline">' + v.history.map(function (x) { return '<li><b>' + h(x.action) + '</b><br><span class="small muted">' + U.fmtDateTime(x.at) + ' · ' + h(x.by) + (x.remarks ? ' — ' + h(x.remarks) : '') + '</span></li>'; }).join('') + '</ul></div>' +
        '<div><h4>' + icon('car') + ' Earlier reports on this vehicle</h4>' + (v.prior.length ? '<table class="t small"><tbody>' + v.prior.slice(0, 8).map(function (p) { return '<tr><td class="mono"><a href="#" data-open="' + p.id + '">' + p.id + '</a></td><td>' + U.fmtDate(p.ts) + '</td><td>' + h(p.type) + '</td><td>' + stBadge(p.status) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="small muted">None</div>') + '</div></div>';
      var foot = (v.fine ? (!v.paid ? '<button class="btn success" data-a="paid">' + icon('check') + ' Mark fine paid</button>' : '') + '<button class="btn primary" data-challan>' + icon('print') + ' Print challan</button>' : '');
      var md = U.modal('Report ' + v.id, html, { wide: true, icon: 'file', footer: foot || null });
      md.querySelectorAll('[data-open]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); md.close(); openViolation(a.dataset.open, after); }; });
      md.querySelectorAll('[data-a]').forEach(function (b) {
        b.onclick = function () {
          var body = { action: b.dataset.a, remarks: (md.querySelector('#aRem') || {}).value, plate: (md.querySelector('#aPlate') || {}).value, fine: (md.querySelector('#aFine') || {}).value };
          U.apiSafe('POST', '/api/violations/' + v.id + '/action', body).then(function (nv) { U.toast(v.id + ': ' + nv.status, 'ok'); md.close(); if (after) after(); openViolation(v.id, after); });
        };
      });
      var cb = md.querySelector('[data-challan]'); if (cb) cb.onclick = function () { printChallan(v); };
    }).catch(function (e) { U.toast(e.message, 'err'); });
  }
  function printChallan(v) {
    var issued = (v.history.filter(function (x) { return /Challan|towed/i.test(x.action); })[0] || {}).at || v.ts;
    var html = '<div class="challan"><div class="center">' + U.logo('parking', 'logo-print') + '</div>' +
      '<h3>TRAFFIC POLICE, PUDUCHERRY — PARKING VIOLATION NOTICE</h3><div class="center small">ParkSmart prototype · Puducherry Police Hackathon 2026</div>' +
      '<table><tr><td><b>Notice No.</b></td><td>' + h(v.challanNo || ('PYT/' + v.id)) + '</td><td rowspan="4" style="width:120px;text-align:center">' + U.qrSvg('PARKSMART|' + v.id + '|' + v.plate + '|' + v.fine, 3) + '<div class="tiny">Scan to verify</div></td></tr>' +
      '<tr><td><b>Vehicle No.</b></td><td class="mono" style="font-size:18px">' + h(v.plate) + ' (' + h(v.vehicle) + ')</td></tr><tr><td><b>Violation</b></td><td>' + h(v.type) + '</td></tr><tr><td><b>Fine</b></td><td><b>₹' + v.fine + '</b> ' + (v.status === 'Towed' ? '(includes towing ₹500)' : '') + '</td></tr>' +
      '<tr><td><b>Place</b></td><td colspan="2">' + h(v.place) + ' (' + v.lat + ', ' + v.lng + ')</td></tr><tr><td><b>Date & time</b></td><td colspan="2">Detected ' + U.fmtDateTime(v.ts) + ' · Issued ' + U.fmtDateTime(issued) + '</td></tr>' +
      '<tr><td><b>Evidence</b></td><td colspan="2">Report ' + h(v.id) + ' · Source: ' + h((SRC[v.source] || {}).label) + (v.photoHash ? '<br><span class="mono tiny">Photo SHA-256 ' + h(v.photoHash.slice(0, 32)) + '…</span>' : '') + '</td></tr></table>' +
      (v.photo ? '<img src="' + h(v.photo) + '" style="max-width:260px;max-height:160px;border:1px solid #000">' : '') +
      '<p class="small">Pay within 15 days. Repeat offences attract higher penalty. Officer: ______________________ &nbsp; Signature: ______________</p>' +
      '<div class="stamp">PROTOTYPE FOR HACKATHON DEMONSTRATION — NOT A LEGAL NOTICE</div></div>';
    U.modal('Challan — ' + v.id, html, { icon: 'print', print: true });
  }

  // =====================================================================
  // POLICE: CCTV
  // =====================================================================
  function viewCctv(main) {
    // Real video + AI on the laptop; the phone app keeps the light simulated feed
    if (!(window.RealCCTV && window.RealCCTV.available())) return window.CCTV.mount(main);
    main.innerHTML = '<div class="page-head"><h2>' + icon('cctv', 'lg') + ' CCTV No-Parking Detection</h2><span class="badge red"><span class="live-dot"></span>&nbsp;REC</span>' +
      '<div class="actions"><div class="seg" id="cMode"><button data-m="real">' + icon('cctv') + ' Real video (AI)</button><button data-m="sim">' + icon('zap') + ' Simulation</button></div></div>' +
      '<div class="sub" id="cSub"></div></div><div id="cBody"></div>';
    function show(m) {
      U.lsSet('ps_cctv_mode', m);
      main.querySelectorAll('#cMode button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
      var body = main.querySelector('#cBody');
      body.innerHTML = '';
      var fresh = document.createElement('div'); body.appendChild(fresh);
      if (m === 'real') {
        main.querySelector('#cSub').textContent = 'Real Puducherry street video. An AI detector finds every vehicle, tracks it, and times how long it stays still inside the red no-parking zone. Over the limit, the frame is saved as evidence and a report is filed automatically.';
        window.RealCCTV.mount(fresh);
      } else {
        main.querySelector('#cSub').textContent = 'Simulated top-down feed: shows the full flow quickly (dwell timer, ANPR close-up, auto-filed report).';
        window.CCTV.mount(fresh);
        var ph = fresh.querySelector('.page-head'); if (ph) ph.remove();
      }
    }
    main.querySelectorAll('#cMode button').forEach(function (b) { b.onclick = function () { show(b.dataset.m); }; });
    show(U.lsGet('ps_cctv_mode', 'real') === 'sim' ? 'sim' : 'real');
  }

  // =====================================================================
  // LOTS (police + attendant)
  // =====================================================================
  function viewLots(main) {
    var me = U.state.user;
    main.innerHTML = '<div class="page-head"><h2>' + icon('parking', 'lg') + ' Parking Lots</h2><div class="sub">' +
      (me.role === 'attendant' ? 'Tap + when a vehicle enters and − when it leaves. Citizens see the change instantly.' : 'Live occupancy from gate counters / sensors. Attendants update counts from their phones.') + '</div></div><div id="lotsBody"></div>';
    var lots = [];
    function paint() {
      var body = main.querySelector('#lotsBody'); if (!body) return;
      if (me.role === 'attendant') {
        var l = lots.find(function (x) { return x.id === me.lotId; }); if (!l) return;
        body.innerHTML = '<div class="card" style="max-width:520px"><h3>' + icon('parking') + ' ' + h(l.name) + '</h3><p class="small muted">' + h(l.area) + '</p>' +
          ['car', 'bike'].map(function (k) { var pct = l.occ[k] / (l.cap[k] || 1); return '<h4 style="margin:12px 0 0">' + (k === 'car' ? icon('car') + ' Cars' : icon('route') + ' Two-wheelers') + '</h4><div class="counter"><button class="minus" data-k="' + k + '" data-d="-1" aria-label="Vehicle left">−</button><div class="val"><b>' + l.occ[k] + ' / ' + l.cap[k] + '</b><span class="small muted">' + (l.cap[k] - l.occ[k]) + ' free</span><div class="bar" style="margin-top:4px"><i style="width:' + Math.round(pct * 100) + '%;background:var(--' + (pct >= .9 ? 'red' : pct >= .7 ? 'amber' : 'green') + ')"></i></div></div><button class="plus" data-k="' + k + '" data-d="1" aria-label="Vehicle entered">+</button></div>'; }).join('') +
          '<p class="tiny muted">In full deployment these counts come from boom-barrier or ground sensors automatically.</p></div>';
      } else {
        body.innerHTML = '<div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>Lot</th><th>Zone</th><th>Cars</th><th>Two-wheelers</th><th>Rate/hr</th><th>Status</th><th>Gate counter</th>' + (me.role === 'admin' ? '<th></th>' : '') + '</tr></thead><tbody>' +
          lots.map(function (l) {
            function cell(k) { var pct = l.occ[k] / (l.cap[k] || 1); return '<b>' + l.occ[k] + '</b> / ' + l.cap[k] + '<div class="bar" style="width:110px"><i style="width:' + Math.round(pct * 100) + '%;background:var(--' + (pct >= .9 ? 'red' : pct >= .7 ? 'amber' : 'green') + ')"></i></div>'; }
            return '<tr><td><b>' + h(l.name) + '</b><div class="tiny muted">' + h(l.type) + ' · ' + h(l.hours) + '</div></td><td>' + h(l.zone) + '</td><td>' + cell('car') + '</td><td>' + cell('bike') + '</td><td>₹' + l.rate.car + ' / ₹' + l.rate.bike + '</td><td>' + (l.status === 'open' ? '<span class="badge green">Open</span>' : '<span class="badge">Closed</span>') + '</td>' +
              '<td><div class="btn-row"><button class="btn sm" data-id="' + l.id + '" data-k="car" data-d="1">' + icon('car') + '+</button><button class="btn sm" data-id="' + l.id + '" data-k="car" data-d="-1">' + icon('car') + '−</button></div></td>' +
              (me.role === 'admin' ? '<td><button class="btn sm" data-edit="' + l.id + '">' + icon('edit') + '</button></td>' : '') + '</tr>';
          }).join('') + '</tbody></table></div></div>';
      }
      body.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () { var id = b.dataset.id || me.lotId; U.apiSafe('POST', '/api/lots/' + id + '/count', { kind: b.dataset.k, delta: +b.dataset.d }).then(function (nl) { var i = lots.findIndex(function (x) { return x.id === nl.id; }); lots[i] = nl; paint(); }); };
      });
      body.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editLot(lots.find(function (x) { return x.id === b.dataset.edit; })); }; });
    }
    function editLot(l) {
      var md = U.modal('Edit ' + l.name, '<div class="grid g2"><label class="f">Car capacity<input type="number" id="cc" value="' + l.cap.car + '"></label><label class="f">Two-wheeler capacity<input type="number" id="cb" value="' + l.cap.bike + '"></label>' +
        '<label class="f">Car rate ₹/hr<input type="number" id="rc" value="' + l.rate.car + '"></label><label class="f">Two-wheeler rate ₹/hr<input type="number" id="rb" value="' + l.rate.bike + '"></label></div>' +
        '<label class="f">Status<select id="ls"><option value="open"' + (l.status === 'open' ? ' selected' : '') + '>Open</option><option value="closed"' + (l.status !== 'open' ? ' selected' : '') + '>Closed (event / maintenance)</option></select></label>',
        { icon: 'edit', footer: '<button class="btn primary" data-s>Save</button>' });
      md.querySelector('[data-s]').onclick = function () {
        U.apiSafe('PUT', '/api/lots/' + l.id, { cap: { car: md.querySelector('#cc').value, bike: md.querySelector('#cb').value }, rate: { car: md.querySelector('#rc').value, bike: md.querySelector('#rb').value }, status: md.querySelector('#ls').value })
          .then(function () { md.close(); U.toast('Saved', 'ok'); load(); });
      };
    }
    function load() { U.api('GET', '/api/lots').then(function (r) { lots = r; paint(); }); }
    load();
    U.on('occ', function (upd) { upd.forEach(function (u) { var l = lots.find(function (x) { return x.id === u.id; }); if (l) { l.occ.car = u.car; l.occ.bike = u.bike; } }); paint(); });
  }

  // =====================================================================
  // OFFENDERS
  // =====================================================================
  function viewOffenders(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('car', 'lg') + ' Repeat Offenders</h2><div class="sub">Vehicles reported 2+ times (rejected and duplicate reports excluded). Habitual = 4 or more.</div></div><div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>Vehicle no.</th><th>Reports</th><th>Last seen</th><th>Places</th><th>Fines</th><th>Unpaid</th></tr></thead><tbody id="ob"></tbody></table></div></div>';
    U.api('GET', '/api/offenders').then(function (list) {
      main.querySelector('#ob').innerHTML = list.map(function (o) {
        return '<tr class="click" data-p="' + h(o.plate) + '"><td class="mono"><b>' + h(o.plate) + '</b> ' + (o.habitual ? '<span class="badge red">Habitual</span>' : '') + '<div class="tiny muted">' + h(o.vehicle) + '</div></td><td><b>' + o.n + '</b></td><td>' + U.fmtDate(o.last) + '</td><td class="small">' + o.places.slice(0, 3).map(h).join('<br>') + (o.places.length > 3 ? '<br>+' + (o.places.length - 3) + ' more' : '') + '</td><td>' + U.fmtINR(o.fines) + '</td><td>' + (o.unpaid ? '<b style="color:var(--red)">' + U.fmtINR(o.unpaid) + '</b>' : '—') + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty">No repeat offenders</td></tr>';
      main.querySelectorAll('[data-p]').forEach(function (tr) {
        tr.onclick = function () {
          U.api('GET', '/api/violations?days=60&q=' + encodeURIComponent(tr.dataset.p)).then(function (r) {
            var md = U.modal('Vehicle ' + tr.dataset.p, '<table class="t"><thead><tr><th>ID</th><th>Date</th><th>Violation</th><th>Place</th><th>Status</th><th>Fine</th></tr></thead><tbody>' + r.items.map(function (v) { return '<tr class="click" data-id="' + v.id + '"><td class="mono">' + v.id + '</td><td>' + U.fmtDateTime(v.ts) + '</td><td>' + h(v.type) + '</td><td class="small">' + h(v.place) + '</td><td>' + stBadge(v.status) + '</td><td>' + (v.fine ? '₹' + v.fine + (v.paid ? '' : ' <span class="badge red">unpaid</span>') : '—') + '</td></tr>'; }).join('') + '</tbody></table>', { wide: true, icon: 'car' });
            md.querySelectorAll('[data-id]').forEach(function (x) { x.onclick = function () { md.close(); openViolation(x.dataset.id); }; });
          });
        };
      });
    });
  }

  // =====================================================================
  // ANALYTICS
  // =====================================================================
  function viewAnalytics(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('chart', 'lg') + ' Analytics</h2><div class="actions"><select id="days"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="60">Last 60 days</option></select></div><div class="sub">Where and when violations happen, how fast we respond, and how reliable each reporting channel is.</div></div><div id="ab"></div>';
    var sel = main.querySelector('#days'); sel.onchange = load;
    function load() {
      U.api('GET', '/api/analytics?days=' + sel.value).then(function (a) {
        var pal = U.palette();
        var ab = main.querySelector('#ab');
        ab.innerHTML = '<div class="grid g4">' +
          '<div class="card kpi"><div class="ico">' + icon('flag', 'lg') + '</div><div><div class="v">' + U.num(a.total) + '</div><div class="l">Reports</div></div></div>' +
          '<div class="card kpi green"><div class="ico">' + icon('rupee', 'lg') + '</div><div><div class="v">' + U.fmtINR(a.fines) + '</div><div class="l">Fines issued</div></div></div>' +
          '<div class="card kpi amber"><div class="ico">' + icon('clock', 'lg') + '</div><div><div class="v">' + U.fmtINR(a.fines - a.finesPaid) + '</div><div class="l">Fines pending</div></div></div>' +
          '<div class="card kpi purple"><div class="ico">' + icon('users', 'lg') + '</div><div><div class="v">' + (a.srcAcc.citizen ? Math.round(100 * a.srcAcc.citizen.valid / a.srcAcc.citizen.total) : 0) + '%</div><div class="l">Citizen reports confirmed valid</div></div></div></div>' +
          '<div class="grid g2" style="margin-top:14px"><div class="card"><h3>' + icon('trend') + ' Daily reports</h3><div class="chart-box"><canvas id="c1"></canvas></div></div><div class="card"><h3>' + icon('list') + ' By violation type</h3><div class="chart-box"><canvas id="c2"></canvas></div></div></div>' +
          '<div class="card"><h3>' + icon('clock') + ' When do violations happen? (day × hour)</h3><div class="table-wrap"><table class="heat" id="heat"></table></div><p class="tiny muted">Darker = more reports. Use this to plan tow-vehicle and patrol timings.</p></div>' +
          '<div class="grid g3"><div class="card"><h3>' + icon('pin') + ' Top hotspot stretches</h3><table class="t small">' + a.topPlaces.map(function (p, i) { return '<tr><td>' + (i + 1) + '</td><td>' + h(p.place) + '</td><td class="right"><b>' + p.n + '</b></td></tr>'; }).join('') + '</table></div>' +
          '<div class="card"><h3>' + icon('shieldcheck') + ' Channel reliability</h3><table class="t small"><thead><tr><th>Source</th><th>Closed</th><th>Valid</th></tr></thead>' + Object.keys(a.srcAcc).map(function (k) { var s = a.srcAcc[k]; return '<tr><td>' + srcBadge(k) + '</td><td>' + s.total + '</td><td><b>' + Math.round(100 * s.valid / s.total) + '%</b></td></tr>'; }).join('') + '</table><div class="chart-box sm" style="margin-top:8px"><canvas id="c3"></canvas></div></div>' +
          '<div class="card"><h3>' + icon('clock') + ' Response time by unit</h3><table class="t small"><thead><tr><th>Unit</th><th>Cases</th><th>Median</th></tr></thead>' + Object.keys(a.unitResp).sort().map(function (k) { var u = a.unitResp[k]; return '<tr><td>' + h(k) + '</td><td>' + u.n + '</td><td><b>' + u.median + ' min</b></td></tr>'; }).join('') + '</table><h4 style="margin-top:12px">Outcomes</h4><div class="chart-box sm"><canvas id="c4"></canvas></div></div></div>' +
          '<div class="card" style="padding:8px"><h3 style="padding:4px 6px">' + icon('map') + ' Violation density</h3><div id="amap" class="map"></div></div>';
        var days = Object.keys(a.daily);
        U.chart(ab.querySelector('#c1'), { type: 'line', data: { labels: days.map(function (d) { return d.slice(5); }), datasets: [{ label: 'Reports', data: days.map(function (d) { return a.daily[d]; }), borderColor: pal[0], backgroundColor: pal[0] + '33', fill: true, tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
        var types = Object.keys(a.byType).sort(function (x, y) { return a.byType[y] - a.byType[x]; });
        U.chart(ab.querySelector('#c2'), { type: 'bar', data: { labels: types, datasets: [{ data: types.map(function (t) { return a.byType[t]; }), backgroundColor: pal[1] }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
        var srcs = Object.keys(a.bySource);
        U.chart(ab.querySelector('#c3'), { type: 'doughnut', data: { labels: srcs.map(function (s) { return (SRC[s] || {}).label || s; }), datasets: [{ data: srcs.map(function (s) { return a.bySource[s]; }), backgroundColor: [pal[0], pal[4], pal[2]] }] }, options: { plugins: { legend: { position: 'right' } } } });
        var sts = Object.keys(a.byStatus);
        U.chart(ab.querySelector('#c4'), { type: 'doughnut', data: { labels: sts, datasets: [{ data: sts.map(function (s) { return a.byStatus[s]; }), backgroundColor: pal }] }, options: { plugins: { legend: { position: 'right' } } } });
        var mx = 0; a.matrix.forEach(function (r) { r.forEach(function (v) { mx = Math.max(mx, v); }); });
        var D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        ab.querySelector('#heat').innerHTML = '<tr><th></th>' + a.matrix[0].map(function (_, i) { return '<th>' + (i % 3 === 0 ? i : '') + '</th>'; }).join('') + '</tr>' +
          a.matrix.map(function (r, di) { return '<tr><th style="text-align:right;padding-right:6px">' + D[di] + '</th>' + r.map(function (v, hh) { var t = mx ? v / mx : 0; return '<td title="' + D[di] + ' ' + hh + ':00 — ' + v + ' reports" style="background:rgba(179,38,30,' + (0.06 + t * 0.9).toFixed(2) + ')"></td>'; }).join('') + '</tr>'; }).join('');
        var map = U.makeMap(ab.querySelector('#amap'), CENTER, 14);
        var grid = {}; a.points.forEach(function (p) { var k = (Math.round(p[0] / 0.0012) * 0.0012).toFixed(4) + ',' + (Math.round(p[1] / 0.0012) * 0.0012).toFixed(4); grid[k] = (grid[k] || 0) + 1; });
        var gm = Math.max.apply(null, Object.values(grid).concat([1]));
        Object.keys(grid).forEach(function (k) { var ll = k.split(',').map(Number), n = grid[k]; L.circle(ll, { radius: 40 + 110 * Math.sqrt(n / gm), color: '#b3261e', weight: 1, fillColor: '#b3261e', fillOpacity: 0.15 + 0.5 * n / gm }).addTo(map).bindTooltip(n + ' reports'); });
        meta().then(function (m) { drawNoPark(map, m); });
      });
    }
    load();
  }

  // =====================================================================
  // AUDIT
  // =====================================================================
  function viewAudit(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('lock', 'lg') + ' Audit Log</h2><div class="sub">Every login, report action and data change is recorded.</div></div><div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead><tbody id="au"></tbody></table></div></div>';
    U.api('GET', '/api/audit').then(function (rows) {
      main.querySelector('#au').innerHTML = rows.map(function (r) { return '<tr><td class="small">' + U.fmtDateTime(r.at) + '</td><td>' + h(r.user) + '</td><td>' + h(r.role) + '</td><td>' + h(r.action) + '</td><td class="small">' + h(r.detail) + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="empty">Nothing yet</td></tr>';
    });
  }

  // =====================================================================
  // ABOUT
  // =====================================================================
  function viewAbout(main) {
    main.innerHTML = '<div class="page-head"><h2>' + icon('info', 'lg') + ' About ParkSmart</h2></div><div class="grid g2">' +
      '<div class="card"><h3>' + icon('flag') + ' Problem (PS-03)</h3><p>Motorists struggle to find authorised parking and to know whether spaces are free, while police face unauthorised parking, roadside obstruction and congestion — and have no easy way to receive public reports.</p>' +
      '<h3>' + icon('sparkle') + ' Our solution</h3><ul><li><b>Citizens:</b> live free-slot map, 1-hour forecast, best time to park, one-tap navigation.</li><li><b>Citizens:</b> photo + map violation report without login; tracking ID with QR.</li><li><b>Traffic Police:</b> one queue for citizen, CCTV and officer reports, with auto-priority and duplicate merging.</li><li><b>CCTV:</b> dwell-time rule flags vehicles stopped in no-parking zones and auto-files evidence (simulated feed in the prototype).</li><li><b>Enforcement:</b> challan with QR, repeat-offender tracking, tow/patrol recommendations, zone congestion index.</li><li><b>Attendants:</b> phone gate counter keeps occupancy live without costly sensors.</li></ul></div>' +
      '<div class="card"><h3>' + icon('cpu') + ' How it works</h3><ul><li>Runs on one laptop (Node.js, no internet needed); phones connect over Wi-Fi.</li><li>Occupancy: gate counters now; ground sensors / boom barriers / camera counting later — same API.</li><li>Forecast: hourly demand pattern per lot × weekday factor, blended with the live count.</li><li>Priority: blocking violations at peak hours, transit hubs and hospital roads go first.</li><li>Duplicates: same vehicle or same spot within 30 minutes are linked.</li><li>Evidence: every photo is stored with a SHA-256 fingerprint; all actions are audit-logged.</li></ul>' +
      '<h3>' + icon('users') + ' Developed by</h3><p><b>Siddharth</b>, B.Tech CSE (2nd year), Manakula Vinayagar Institute of Technology, Puducherry.<br>Mentor: <b>Sathish Kumar</b><br>Team: <b>Siddharth</b> (Team Lead) · <b>Aarthy E</b> · <b>Bhavana B</b> · <b>Srinivas @ Aravindh A</b> · <b>Akash T</b></p>' +
      '<div class="note warn small">All data is simulated for the demo. Parking locations and no-parking stretches are approximate. Fine amounts are illustrative.</div></div></div>';
  }

  // =====================================================================
  U.boot({
    title: 'ParkSmart Puducherry', subtitle: 'Smart Parking · Traffic Enforcement · Citizen Reporting (PS-03)', logoSymbol: 'parking',
    footer: 'ParkSmart · PS-03 prototype', publicHome: 'find', streamEvents: ['occ', 'viol'],
    demoUsers: [{ label: 'SP Traffic (admin)', u: 'admin', p: 'Admin@123' }, { label: 'Traffic SI', u: 'traffic', p: 'Officer@123' }, { label: 'Lot attendant', u: 'attendant', p: 'Lot@123' }],
    homeFor: function (u) { return u.role === 'attendant' ? 'lots' : 'dash'; },
    views: [
      { id: 'find', label: 'Find Parking', icon: 'parking', public: true, section: 'Citizens', render: viewFind },
      { id: 'report', label: 'Report Violation', icon: 'camera', public: true, section: 'Citizens', render: viewReport },
      { id: 'track', label: 'Track My Report', icon: 'eye', public: true, section: 'Citizens', render: viewTrack },
      { id: 'dash', label: 'Command Dashboard', icon: 'dashboard', roles: ['admin', 'officer'], section: 'Traffic Police', render: viewDash },
      { id: 'reports', label: 'Violation Reports', icon: 'list', roles: ['admin', 'officer'], section: 'Traffic Police', render: viewReports },
      { id: 'cctv', label: 'CCTV Detection', icon: 'cctv', roles: ['admin', 'officer'], section: 'Traffic Police', render: viewCctv },
      { id: 'lots', label: 'Parking Lots', icon: 'building', roles: ['admin', 'officer', 'attendant'], section: 'Traffic Police', render: viewLots },
      { id: 'offenders', label: 'Repeat Offenders', icon: 'car', roles: ['admin', 'officer'], section: 'Traffic Police', render: viewOffenders },
      { id: 'analytics', label: 'Analytics', icon: 'chart', roles: ['admin', 'officer'], section: 'Traffic Police', render: viewAnalytics },
      { id: 'audit', label: 'Audit Log', icon: 'lock', roles: ['admin'], section: 'Admin', render: viewAudit },
      { id: 'about', label: 'About', icon: 'info', public: true, section: 'Help', render: viewAbout }
    ]
  });
  window.PS03 = { openViolation: openViolation };
})();
