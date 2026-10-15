/* cctv.js — CCTV no-parking detection demo.
   The video feed is SIMULATED (top-down street view). The detection logic is the real idea:
   track each vehicle, measure how long it stays stopped inside the no-parking polygon (dwell time),
   and when dwell > threshold, capture the frame as evidence and file a violation automatically.
   In deployment the boxes would come from an ANPR / YOLO detector on existing CCTV. */
(function () {
  'use strict';
  var W = 960, H = 540;
  var LANES = [205, 265], CURB = 348;
  var LEGAL = { x1: 30, x2: 430 }, ZONE = { x1: 470, x2: 935 };
  var LEGAL_SLOTS = [40, 120, 200, 280, 360];
  var ZONE_SLOTS = [490, 575, 660, 745, 830];
  var COLORS = ['#e8e8e8', '#c0392b', '#2c3e50', '#7f8c8d', '#2471a3', '#f1c40f', '#1e8449', '#5b2c6f', '#d35400', '#ffffff', '#111111'];
  var LET = 'ABCDEFGHJKLMNPRSTUVWXYZ';

  function plate() { return 'PY0' + (Math.random() < .8 ? '1' : '5') + LET[Math.floor(Math.random() * 23)] + LET[Math.floor(Math.random() * 23)] + String(Math.floor(Math.random() * 9000) + 1000); }

  function mount(main) {
    var U = window.UI, h = U.h, icon = U.icon;
    main.innerHTML = '<div class="page-head"><h2>' + icon('cctv', 'lg') + ' CCTV No-Parking Detection</h2><span class="badge red"><span class="live-dot"></span>&nbsp;REC</span>' +
      '<div class="sub">Each vehicle is tracked; if it stays stopped inside the red no-parking zone longer than the limit, the frame is saved as evidence and a report is filed automatically.</div></div>' +
      '<div class="card"><div class="row"><label class="small">Camera <select id="cam"></select></label>' +
      '<label class="small">Allowed stop <select id="thr"><option value="1">1 min</option><option value="2" selected>2 min</option><option value="3">3 min</option><option value="5">5 min</option></select></label>' +
      '<label class="small">Speed <select id="spd"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>' +
      '<label class="check small" style="padding:0"><input type="checkbox" id="auto" checked> Auto-file reports</label>' +
      '<div class="btn-row" style="margin-left:auto"><button class="btn sm" id="force">' + icon('zap') + ' Send a car into the zone</button><button class="btn sm" id="pause">' + icon('clock') + ' Pause</button></div></div></div>' +
      '<div class="grid g-side"><div class="card" style="padding:8px"><div class="cctv-wrap"><canvas id="cv" width="' + W + '" height="' + H + '"></canvas></div>' +
      '<div class="row small" style="padding:8px 4px 0;gap:14px"><span id="st1"></span><span id="st2"></span><span id="st3"></span><span id="st4"></span></div>' +
      '<p class="tiny muted" style="margin:6px 4px 0">Simulated feed: 1 second on screen = 10 seconds real time. Plate reads are simulated ANPR.</p></div>' +
      '<div class="card"><h3>' + icon('bell') + ' Detection events</h3><div id="evts"><div class="empty small">Waiting for a vehicle to overstay in the zone…</div></div></div></div>';

    var cv = main.querySelector('#cv'), ctx = cv.getContext('2d');
    var cams = [], cam = null, vehicles = [], nextId = 1, spawnT = 0, paused = false, filed = 0, last = performance.now(), simClock = Date.now();
    var SCALE = 10;
    var sel = main.querySelector('#cam');
    U.api('GET', '/api/meta').then(function (m) {
      cams = m.noPark.filter(function (z) { return ['N1', 'N2', 'N5', 'N4'].indexOf(z.id) >= 0; }).map(function (z) {
        var mid = z.path[Math.floor(z.path.length / 2)];
        return { id: 'CAM-' + z.id, name: z.name, lat: mid[0], lng: mid[1] };
      });
      sel.innerHTML = cams.map(function (c, i) { return '<option value="' + i + '">' + h(c.id + ' · ' + c.name) + '</option>'; }).join('');
      cam = cams[0];
      sel.onchange = function () { cam = cams[+sel.value]; vehicles = []; };
    });
    main.querySelector('#pause').onclick = function () { paused = !paused; this.innerHTML = icon(paused ? 'arrowright' : 'clock') + (paused ? ' Resume' : ' Pause'); };
    main.querySelector('#force').onclick = function () { spawn(true); };
    function thrSec() { return (+main.querySelector('#thr').value) * 60 / SCALE; }

    function taken(slotX) { return vehicles.some(function (v) { return v.slot === slotX; }); }
    function spawn(forceZone) {
      var kind = Math.random() < .6 ? 'car' : Math.random() < .6 ? 'bike' : 'auto';
      if (forceZone) kind = 'car';
      var dims = { car: [64, 30], bike: [34, 14], auto: [44, 26] }[kind];
      var lane = Math.random() < .5 ? 0 : 1;
      var v = { id: nextId++, kind: kind, w: dims[0], h: dims[1], x: -80, y: LANES[lane], lane: lane, v: 90 + Math.random() * 70, color: COLORS[Math.floor(Math.random() * COLORS.length)], plate: plate(), state: 'drive', dwell: 0, conf: (0.86 + Math.random() * 0.13).toFixed(2) };
      var park = forceZone || Math.random() < 0.32;
      if (park) {
        var inZone = forceZone || Math.random() < 0.55;
        var slots = (inZone ? ZONE_SLOTS : LEGAL_SLOTS).filter(function (s) { return !taken(s); });
        if (slots.length) { v.slot = slots[Math.floor(Math.random() * slots.length)]; v.zone = inZone; v.stay = inZone ? (forceZone ? 40 : 5 + Math.random() * 30) : 6 + Math.random() * 25; v.lane = 1; v.y = LANES[1]; }
      }
      vehicles.push(v);
    }

    function update(dt) {
      spawnT -= dt;
      if (spawnT <= 0) { spawn(false); spawnT = 0.9 + Math.random() * 1.8; }
      vehicles.forEach(function (v) {
        if (v.state === 'drive') {
          // keep distance from vehicle ahead in same lane
          var ahead = null;
          vehicles.forEach(function (o) { if (o !== v && o.state === 'drive' && Math.abs(o.y - v.y) < 10 && o.x > v.x && (!ahead || o.x < ahead.x)) ahead = o; });
          var sp = v.v; if (ahead && ahead.x - v.x < 95) sp = Math.min(sp, ahead.v * 0.9, (ahead.x - v.x - 60) * 3);
          v.x += Math.max(0, sp) * dt;
          if (v.slot != null && !v.done && v.x >= v.slot - 75) v.state = 'pullin';
        } else if (v.state === 'pullin') {
          v.x = Math.min(v.slot, v.x + 45 * dt); v.y += (CURB - v.y) * Math.min(1, dt * 4);
          if (v.x >= v.slot && Math.abs(v.y - CURB) < 1.5) { v.y = CURB; v.state = 'parked'; v.parked = 0; }
        } else if (v.state === 'parked') {
          v.parked += dt;
          if (v.zone) v.dwell += dt;
          if (v.parked >= v.stay) v.state = 'pullout';
        } else if (v.state === 'pullout') {
          v.x += 45 * dt; v.y += (LANES[1] - v.y) * Math.min(1, dt * 1.8);
          if (Math.abs(v.y - LANES[1]) < 2) { v.y = LANES[1]; v.state = 'drive'; v.done = true; v.slot = null; }
        }
        // detection rule
        if (v.zone && v.state === 'parked' && !v.flagged && v.dwell >= thrSec()) { v.flagged = true; v.flagAt = Date.now(); flag(v); }
      });
      vehicles = vehicles.filter(function (v) { return v.x < W + 100; });
    }

    function drawScene() {
      // buildings / footpaths
      ctx.fillStyle = '#3b3f45'; ctx.fillRect(0, 0, W, H);
      var bc = ['#6d5d4b', '#7a6a58', '#5f6b5a', '#80705c', '#6b5b6e', '#5b6b7b'];
      for (var i = 0; i < 12; i++) { ctx.fillStyle = bc[i % bc.length]; ctx.fillRect(i * 82, 8, 76, 100); ctx.fillRect(i * 82 + 6, 440, 74, 92); }
      ctx.fillStyle = '#9a9488'; ctx.fillRect(0, 112, W, 52); ctx.fillRect(0, 380, W, 56);
      // road
      ctx.fillStyle = '#2b2d31'; ctx.fillRect(0, 164, W, 216);
      ctx.strokeStyle = '#e9e5d6'; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
      ctx.beginPath(); ctx.moveTo(0, 235); ctx.lineTo(W, 235); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#e9e5d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(W, 300); ctx.stroke();
      // legal bays
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      LEGAL_SLOTS.forEach(function (x) { ctx.strokeRect(x - 38, 322, 76, 52); });
      ctx.fillStyle = 'rgba(29,95,191,.85)'; ctx.font = 'bold 18px Times New Roman'; ctx.fillText('P  AUTHORISED PARKING', 40, 395 + 22);
      // no-parking zone (hatched)
      ctx.save(); ctx.beginPath(); ctx.rect(ZONE.x1, 312, ZONE.x2 - ZONE.x1, 66); ctx.clip();
      ctx.fillStyle = 'rgba(179,38,30,.22)'; ctx.fillRect(ZONE.x1, 312, ZONE.x2 - ZONE.x1, 66);
      ctx.strokeStyle = 'rgba(230,60,50,.7)'; ctx.lineWidth = 3;
      for (var x = ZONE.x1 - 80; x < ZONE.x2; x += 22) { ctx.beginPath(); ctx.moveTo(x, 378); ctx.lineTo(x + 66, 312); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#e8463a'; ctx.lineWidth = 3; ctx.strokeRect(ZONE.x1, 312, ZONE.x2 - ZONE.x1, 66);
      ctx.fillStyle = '#ff5a4d'; ctx.font = 'bold 18px Times New Roman'; ctx.fillText('NO PARKING ZONE (detection polygon)', ZONE.x1 + 6, 417);
      // sign
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ZONE.x1 - 18, 400, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ZONE.x1 - 18, 400, 11, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ZONE.x1 - 26, 392); ctx.lineTo(ZONE.x1 - 10, 408); ctx.stroke();
    }
    function drawVehicle(v) {
      ctx.save(); ctx.translate(v.x, v.y);
      var w = v.w, hh = v.h;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 3, -hh / 2 + 4, w, hh);
      ctx.fillStyle = v.color; roundRect(-w / 2, -hh / 2, w, hh, v.kind === 'bike' ? 6 : 7); ctx.fill();
      if (v.kind !== 'bike') {
        ctx.fillStyle = 'rgba(20,30,45,.75)'; roundRect(w / 2 - (v.kind === 'auto' ? 16 : 22), -hh / 2 + 4, v.kind === 'auto' ? 10 : 13, hh - 8, 3); ctx.fill();
        roundRect(-w / 2 + 6, -hh / 2 + 5, 9, hh - 10, 3); ctx.fill();
        if (v.kind === 'auto') { ctx.fillStyle = '#1e1e1e'; ctx.fillRect(-w / 2 + 16, -hh / 2 + 2, 14, hh - 4); }
      } else { ctx.fillStyle = '#222'; ctx.fillRect(-4, -hh / 2 - 3, 10, hh + 6); }
      ctx.restore();
    }
    function drawBox(v) {
      var x = v.x - v.w / 2 - 5, y = v.y - v.h / 2 - 5, w = v.w + 10, hh = v.h + 10;
      var col = '#3ddc84', label = v.kind + ' ' + v.conf + '  #' + v.id;
      if (v.state === 'parked' && !v.zone) { col = '#5aa0ff'; label = 'parked · legal bay  #' + v.id; }
      if (v.flagged && v.state !== 'parked') { label = v.kind + ' ' + v.conf + '  #' + v.id + ' · filed'; }
      if (v.zone && v.state === 'parked') {
        var real = Math.round(v.dwell * SCALE), mm = Math.floor(real / 60), ss = real % 60;
        var t = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
        if (v.flagged) { col = '#ff3b30'; label = 'VIOLATION · ' + t + ' · ' + v.plate; }
        else if (v.dwell > thrSec() * 0.5) { col = '#ffb000'; label = 'stopped in zone ' + t; }
        else { col = '#ffe066'; label = 'stopped in zone ' + t; }
      }
      var red = v.flagged && v.state === 'parked';
      ctx.strokeStyle = col; ctx.lineWidth = red ? 3 : 2;
      if (v.state === 'drive') ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, hh); ctx.setLineDash([]);
      ctx.font = 'bold 13px Times New Roman';
      var tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = col; ctx.fillRect(x, y - 18, tw, 17);
      ctx.fillStyle = '#000'; ctx.fillText(label, x + 4, y - 5);
      if (v.zone && v.state === 'parked' && !v.flagged) {
        var p = Math.min(1, v.dwell / thrSec());
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y + hh + 3, w, 5);
        ctx.fillStyle = col; ctx.fillRect(x, y + hh + 3, w * p, 5);
      }
    }
    function drawHud() {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 30);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Times New Roman';
      ctx.fillText((cam ? cam.id + '  ' + cam.name : 'CAM') + '   ' + new Date(simClock).toLocaleString('en-IN'), 10, 21);
      if (Math.floor(Date.now() / 600) % 2) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(W - 70, 15, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.fillText('REC', W - 58, 21);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '14px Times New Roman'; ctx.fillText('SIMULATED FEED · ParkSmart prototype', W - 270, H - 10);
    }
    function roundRect(x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function draw() { drawScene(); vehicles.forEach(drawVehicle); vehicles.forEach(drawBox); drawHud(); }

    function flag(v) {
      draw();
      var shot = cv.toDataURL('image/jpeg', 0.72);
      var evts = main.querySelector('#evts');
      if (evts.querySelector('.empty')) evts.innerHTML = '';
      var real = Math.round(v.dwell * SCALE);
      var row = document.createElement('div'); row.className = 'evt';
      row.innerHTML = '<img src="' + shot + '" alt="snapshot"><div style="flex:1;min-width:0"><b>' + h(v.plate) + '</b> stopped ' + Math.floor(real / 60) + ' min ' + (real % 60) + ' s in zone<div class="tiny muted">' + h(cam ? cam.id : '') + ' · ' + U.fmtTime(new Date()) + '</div><div class="tiny" data-st>' + (main.querySelector('#auto').checked ? 'Filing report…' : '<button class="btn sm">File report</button>') + '</div></div>';
      evts.insertBefore(row, evts.firstChild);
      function file() {
        var st = row.querySelector('[data-st]'); st.textContent = 'Filing report…';
        var jit = function () { return (Math.random() - .5) * 0.0005; };
        U.api('POST', '/api/violations', { source: 'camera', cameraId: cam.id, type: 'Parking in no-parking zone', plate: v.plate, vehicle: v.kind === 'bike' ? 'Two-wheeler' : v.kind === 'auto' ? 'Auto' : 'Car', lat: cam.lat + jit(), lng: cam.lng + jit(), photo: shot, dwell: Math.floor(real / 60) + 'm ' + (real % 60) + 's' })
          .then(function (r) { filed++; st.innerHTML = 'Filed <a href="#" data-id="' + r.id + '">' + r.id + '</a> · priority ' + h(r.priority); st.querySelector('a').onclick = function (e) { e.preventDefault(); window.PS03.openViolation(r.id); }; })
          .catch(function (e) { st.textContent = 'Could not file: ' + e.message; });
      }
      if (main.querySelector('#auto').checked) file(); else row.querySelector('button').onclick = file;
      while (evts.children.length > 12) evts.removeChild(evts.lastChild);
    }

    function loop(now) {
      if (!cv.isConnected) return;  // page changed: stop
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused && cam) {
        var spd = +main.querySelector('#spd').value;
        for (var i = 0; i < spd; i++) update(dt);
        simClock += dt * spd * SCALE * 1000;
      }
      draw();
      var inZ = vehicles.filter(function (v) { return v.zone && v.state === 'parked'; }).length;
      main.querySelector('#st1').innerHTML = icon('car') + ' Tracking ' + vehicles.length;
      main.querySelector('#st2').innerHTML = icon('parking') + ' Legal ' + vehicles.filter(function (v) { return !v.zone && v.state === 'parked'; }).length;
      main.querySelector('#st3').innerHTML = icon('alert') + ' In zone ' + inZ;
      main.querySelector('#st4').innerHTML = icon('flag') + ' Filed ' + filed;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  window.CCTV = { mount: mount };
})();
