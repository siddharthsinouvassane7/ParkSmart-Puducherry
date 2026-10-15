/* realcctv.js — CCTV no-parking detection on REAL video.
   - Video: real street footage (Puducherry clips from Pexels, free licence) or any video the officer uploads.
   - Detection: COCO-SSD object detector (TensorFlow.js), bundled in lib/ai — runs offline in the browser.
   - Tracking: each vehicle box is matched frame to frame (overlap / distance) and gets an ID.
   - Rule: a vehicle that stays STILL inside the red no-parking zone longer than the allowed time is a violation:
     the frame is saved as evidence, the number plate is read by OCR if it is close enough, and a report is filed. */
(function () {
  'use strict';
  var VEH = { car: 'Car', motorcycle: 'Two-wheeler', bus: 'Bus', truck: 'Truck', bicycle: 'Bicycle' };
  var CAMS = [
    { id: 'CAM-P1', name: 'Roadside bike parking, Puducherry (real CCTV)', src: 'media/cctv/puducherry_roadside_cctv.mp4', loc: 'N1',
      credit: 'Real Puducherry CCTV footage as shown on Jaya Plus news ("Bike theft from roadside parking", YouTube). Used for a college demo only.',
      zone: [[0.42, 0.62], [0.70, 0.40], [1.0, 0.52], [1.0, 1.0], [0.42, 1.0]] },
    { id: 'CAM-P2', name: 'Residential lane at night, Puducherry (real CCTV)', src: 'media/cctv/puducherry_lane_night_cctv.mp4', loc: 'N2',
      credit: 'Real Puducherry CCTV footage as shown on Sun News ("Bike theft CCTV", YouTube). Used for a college demo only.',
      zone: [[0.14, 0.42], [0.62, 0.42], [0.62, 1.0], [0.14, 1.0]] },
    { id: 'CAM-W1', name: 'White Town street, Puducherry', src: 'media/cctv/puducherry_whitetown.mp4', loc: 'N8',
      credit: 'Real video: "Beautiful buildings in French town of Pondicherry" by Social Sudo, Pexels (free licence)',
      zone: [[0.0, 0.62], [0.33, 0.56], [0.36, 0.64], [0.02, 0.80]] },
    { id: 'CAM-R1', name: 'Roadside two-wheeler parking', src: 'media/cctv/roadside_parking.mp4', loc: 'N3',
      credit: 'Real video: "A street with motorcycles and people walking on it" by Manoo Media, Pexels (free licence, tagged Pondicherry)',
      zone: [[0.21, 0.50], [0.40, 0.50], [0.36, 0.95], [0.17, 0.95]] }
  ];
  var aiReady = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[data-src="' + src + '"]')) return res();
      var s = document.createElement('script'); s.src = src; s.setAttribute('data-src', src);
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  // Load TensorFlow.js + COCO-SSD model from this app (no internet)
  function loadAI(onStatus) {
    if (aiReady) return aiReady;
    aiReady = loadScript('lib/ai/tf.min.js').then(function () { return loadScript('lib/ai/coco-ssd.min.js'); }).then(function () {
      onStatus && onStatus('Loading the AI model (about 18 MB, from this laptop)…');
      return window.tf.ready();
    }).then(function () {
      var base = new URL('lib/ai/model/model.json', location.href).href;
      return window.cocoSsd.load({ modelUrl: base });
    });
    aiReady.catch(function () { aiReady = null; });
    return aiReady;
  }

  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function iou(a, b) {
    var x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
    var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return inter / (a[2] * a[3] + b[2] * b[3] - inter || 1);
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function mount(main, opts) {
    var U = window.UI, h = U.h, icon = U.icon;
    main.innerHTML =
      '<div class="card"><div class="row" style="flex-wrap:wrap">' +
        '<label class="small">Camera <select id="rcCam"></select></label>' +
        '<label class="small">Location <select id="rcLoc"></select></label>' +
        '<label class="small">Allowed stop <select id="rcThr"><option value="1">1 min</option><option value="2" selected>2 min</option><option value="3">3 min</option><option value="5">5 min</option></select></label>' +
        '<label class="small" title="Short clips are replayed; each second of video counts as this many seconds">Demo time <select id="rcScale"><option value="1">real time</option><option value="5">1 s = 5 s</option><option value="10" selected>1 s = 10 s</option><option value="20">1 s = 20 s</option></select></label>' +
        '<label class="check small" style="padding:0"><input type="checkbox" id="rcAuto" checked> Auto-file reports</label>' +
        '<div class="btn-row" style="margin-left:auto">' +
          '<button class="btn sm" id="rcDraw">' + icon('pin') + ' Draw no-parking zone</button>' +
          '<label class="btn sm" style="cursor:pointer">' + icon('upload') + ' Use your own video<input type="file" id="rcFile" accept="video/*" style="display:none"></label>' +
          '<button class="btn sm" id="rcPause">' + icon('clock') + ' Pause</button></div></div></div>' +
      '<div class="grid g-side"><div class="card" style="padding:8px"><div class="cctv-wrap rc-wrap" id="rcWrap">' +
        '<video id="rcVid" muted playsinline loop preload="auto"></video><canvas id="rcCv"></canvas>' +
        '<div class="rc-status" id="rcStatus">Starting…</div></div>' +
        '<div class="row small" style="padding:8px 4px 0;gap:14px"><span id="rcS1"></span><span id="rcS2"></span><span id="rcS3"></span><span id="rcS4"></span></div>' +
        '<p class="tiny muted" style="margin:6px 4px 0" id="rcCredit"></p>' +
        '<p class="tiny muted" style="margin:2px 4px 0">AI: COCO-SSD object detector (TensorFlow.js) running offline on this computer · tracking + dwell-time rule · number plate OCR when the vehicle is close enough.</p></div>' +
      '<div class="card"><h3>' + icon('bell') + ' Detection events</h3><div id="rcEvts"><div class="empty small">Waiting for a vehicle to stay in the red zone…</div></div></div></div>';

    var vid = main.querySelector('#rcVid'), cv = main.querySelector('#rcCv'), ctx = cv.getContext('2d');
    var statusEl = main.querySelector('#rcStatus');
    var model = null, alive = true, paused = false, drawing = null, cam = null, meta = null;
    var reported = [], tracks = [], nextId = 1, loops = 0, lastT = 0, lastVT = null, filed = 0, busy = false, lastDet = [];
    var userCam = null;

    function status(t) { statusEl.textContent = t || ''; statusEl.style.display = t ? '' : 'none'; }
    function vt() { return loops * (vid.duration || 0) + vid.currentTime; }
    function scale() { return +main.querySelector('#rcScale').value; }
    function thr() { return (+main.querySelector('#rcThr').value) * 60; }
    function zoneKey() { return 'ps_rc_zone_' + (cam ? cam.id : ''); }
    function zone() { var z = lsGet(zoneKey()); try { z = z && JSON.parse(z); } catch (e) { z = null; } return (z && z.length >= 3) ? z : cam.zone; }

    var camSel = main.querySelector('#rcCam'), locSel = main.querySelector('#rcLoc');
    function fillCams() {
      var list = CAMS.concat(userCam ? [userCam] : []);
      camSel.innerHTML = list.map(function (c, i) { return '<option value="' + i + '">' + h(c.id + ' · ' + c.name) + '</option>'; }).join('');
      return list;
    }
    function selectCam(c) {
      cam = c; tracks = []; reported = []; loops = 0; lastT = 0; lastVT = null; lastDet = [];
      locSel.value = lsGet('ps_rc_loc_' + c.id) || c.loc;
      main.querySelector('#rcCredit').textContent = c.credit;
      var src = c.src;
      // WebM (VP9) plays in every browser incl. plain Chromium; MP4 (H.264) is the fallback
      if (/\.mp4$/.test(src) && vid.canPlayType('video/webm; codecs="vp9"')) src = src.replace(/\.mp4$/, '.webm');
      vid.src = src; vid.load();
      var p = vid.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: user can press play */ });
    }
    U.api('GET', '/api/meta').then(function (m) {
      meta = m;
      locSel.innerHTML = m.noPark.map(function (z) { return '<option value="' + z.id + '">' + h(z.name) + '</option>'; }).join('');
      var list = fillCams();
      selectCam(list[0]);
      camSel.onchange = function () { var i = +camSel.value; var list = fillCams(); camSel.value = String(i); selectCam(list[i]); };
      locSel.onchange = function () { lsSet('ps_rc_loc_' + cam.id, locSel.value); };
    });
    main.querySelector('#rcFile').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      if (userCam && userCam.src.indexOf('blob:') === 0) URL.revokeObjectURL(userCam.src);
      userCam = { id: 'CAM-U1', name: 'Your video: ' + f.name.slice(0, 40), src: URL.createObjectURL(f), loc: 'N1', credit: 'Video uploaded by the officer (stays on this computer).', zone: [[0.05, 0.6], [0.45, 0.6], [0.45, 0.95], [0.05, 0.95]] };
      fillCams(); camSel.value = String(CAMS.length); selectCam(userCam);
      U.toast('Now draw the no-parking zone on your video', 'ok');
    };
    main.querySelector('#rcPause').onclick = function () {
      paused = !paused;
      if (paused) vid.pause(); else vid.play();
      this.innerHTML = icon(paused ? 'arrowright' : 'clock') + (paused ? ' Resume' : ' Pause');
    };
    // ---- zone drawing: click points on the video, "Finish zone" when done
    var drawBtn = main.querySelector('#rcDraw');
    drawBtn.onclick = function () {
      if (!drawing) { drawing = []; drawBtn.innerHTML = icon('check') + ' Finish zone'; U.toast('Click the corners of the no-parking area on the video, then press Finish zone', 'ok'); }
      else {
        if (drawing.length >= 3) { lsSet(zoneKey(), JSON.stringify(drawing)); tracks.forEach(function (t) { t.dwell = 0; t.flagged = false; }); U.toast('Zone saved for ' + cam.id, 'ok'); }
        else U.toast('Need at least 3 points — zone not changed', 'err');
        drawing = null; drawBtn.innerHTML = icon('pin') + ' Draw no-parking zone';
      }
    };
    cv.addEventListener('click', function (e) {
      if (!drawing) return;
      var r = cv.getBoundingClientRect();
      drawing.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
    });

    vid.addEventListener('loadedmetadata', function () { cv.width = vid.videoWidth; cv.height = vid.videoHeight; });
    vid.addEventListener('loadstart', function () { if (model) status('Loading video…'); });
    vid.addEventListener('loadeddata', function () { if (model) status(''); });
    vid.addEventListener('timeupdate', function () { if (vid.currentTime + 0.5 < lastT) loops++; lastT = vid.currentTime; });

    status('Loading AI detector…');
    loadAI(status).then(function (m) { model = m; status(''); tick(); }).catch(function (e) { status('AI detector could not start: ' + e.message); });

    // ---- detection + tracking loop
    function tick() {
      if (!alive) return;
      if (!cv.isConnected) { alive = false; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* ignore */ } return; }
      if (!busy && model && vid.readyState >= 2 && !vid.paused) {
        busy = true;
        var t = vt();
        detectTiled().then(function (dets) {
          busy = false;
          if (!alive) return;
          update(dets, t);
        }).catch(function () { busy = false; });
      }
      draw();
      requestAnimationFrame(tick);
    }

    // Real CCTV is wide and low-resolution, so small parked bikes are missed when the whole frame is
    // shrunk to the detector's input. Look at the full frame AND at enlarged tiles that cover the
    // no-parking zone, then merge the boxes (non-maximum suppression).
    var tcv = document.createElement('canvas'), tg = tcv.getContext('2d');
    function detectTiled() {
      var W = vid.videoWidth, H = vid.videoHeight, z = zone();
      var zx0 = 1, zy0 = 1, zx1 = 0, zy1 = 0;
      z.forEach(function (p) { zx0 = Math.min(zx0, p[0]); zy0 = Math.min(zy0, p[1]); zx1 = Math.max(zx1, p[0]); zy1 = Math.max(zy1, p[1]); });
      zx0 = Math.max(0, zx0 - 0.08); zy0 = Math.max(0, zy0 - 0.25); zx1 = Math.min(1, zx1 + 0.08); zy1 = Math.min(1, zy1 + 0.05);
      // tiles of at most ~45% x 65% of the frame, overlapping by 20%, covering only the zone area
      var tiles = [[0, 0, 1, 1]], bw = zx1 - zx0, bh = zy1 - zy0;
      var nc = Math.max(1, Math.ceil(bw / 0.45)), nr = Math.max(1, Math.ceil(bh / 0.65));
      if (nc * nr === 1 && bw * bh > 0.5) nc = 2;
      var tw = Math.min(bw, bw / nc * 1.2), th = Math.min(bh, bh / nr * 1.2);
      for (var r = 0; r < nr; r++) for (var c = 0; c < nc; c++) {
        tiles.push([nc === 1 ? zx0 : zx0 + (bw - tw) * c / (nc - 1), nr === 1 ? zy0 : zy0 + (bh - th) * r / (nr - 1), tw, th]);
      }
      var all = [];
      return tiles.reduce(function (pr, tl) {
        return pr.then(function () { return new Promise(function (res) { setTimeout(res, 0); }); }).then(function () {   // let the page breathe between tiles
          if (!alive || vid.readyState < 2) return;
          var sx = tl[0] * W, sy = tl[1] * H, sw = tl[2] * W, sh = tl[3] * H, k = Math.min(2.5, 640 / Math.max(sw, sh));
          tcv.width = Math.round(sw * k); tcv.height = Math.round(sh * k);
          tg.drawImage(vid, sx, sy, sw, sh, 0, 0, tcv.width, tcv.height);
          return model.detect(tcv, 40, 0.2).then(function (ds) {
            ds.forEach(function (d) {
              if (!VEH[d.class]) return;
              var b = [sx + d.bbox[0] / k, sy + d.bbox[1] / k, d.bbox[2] / k, d.bbox[3] / k];
              // drop boxes cut by an inner tile edge (the full frame or a neighbouring tile sees them whole)
              if (tl[2] < 1 && b[2] * b[3] > sw * sh * 0.6) return;
              all.push({ class: d.class, score: d.score, bbox: b });
            });
          });
        });
      }, Promise.resolve()).then(function () {
        all.sort(function (a, b) { return b.score - a.score; });
        var keep = [];
        all.forEach(function (d) {
          var dup = keep.some(function (k2) {
            var a = d.bbox, b = k2.bbox;
            var ix = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
            var iy = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
            var inter = ix * iy;
            return inter / (a[2] * a[3] + b[2] * b[3] - inter) > 0.4 || inter / Math.min(a[2] * a[3], b[2] * b[3]) > 0.7;
          });
          if (!dup) keep.push(d);
        });
        return keep;
      });
    }

    function update(dets, t) {
      var W = cv.width || 1, H = cv.height || 1, z = zone();
      var dt = lastVT == null ? 0 : Math.max(0, Math.min(5, t - lastVT));
      lastVT = t;
      lastDet = dets;
      var used = {};
      // match detections to tracks (best overlap first)
      var pairs = [];
      tracks.forEach(function (tr, ti) {
        dets.forEach(function (d, di) {
          var o = iou(tr.box, d.bbox);
          var cx = d.bbox[0] + d.bbox[2] / 2, cy = d.bbox[1] + d.bbox[3] / 2;
          var dist = Math.hypot(cx - tr.cx, cy - tr.cy) / Math.max(tr.box[2], tr.box[3]);
          if (o > 0.15 || dist < 0.6) pairs.push({ ti: ti, di: di, s: o - dist * 0.2 });
        });
      });
      pairs.sort(function (a, b) { return b.s - a.s; });
      var tUsed = {};
      pairs.forEach(function (p) {
        if (tUsed[p.ti] || used[p.di]) return;
        tUsed[p.ti] = used[p.di] = true;
        var tr = tracks[p.ti], d = dets[p.di];
        tr.box = d.bbox.map(function (v, k) { return tr.box[k] * 0.15 + v * 0.85; });
        tr.cls = d.class; tr.score = d.score; tr.seen = t; tr.hits++;
      });
      dets.forEach(function (d, di) {
        if (used[di]) return;
        tracks.push({ id: nextId++, cls: d.class, score: d.score, box: d.bbox.slice(), seen: t, born: t, hits: 1, hist: [], dwell: 0, still: 0, flagged: false });
      });
      tracks.forEach(function (tr) { tr.miss = tr.seen === t ? 0 : (tr.miss || 0) + 1; });
      // detections on real CCTV flicker: keep a track for a few missed rounds (slow computers do fewer rounds per second)
      tracks = tracks.filter(function (tr) { return tr.miss < 3 || t - tr.seen < 4; });
      tracks.forEach(function (tr) {
        tr.cx = tr.box[0] + tr.box[2] / 2; tr.cy = tr.box[1] + tr.box[3] / 2;
        tr.hist.push({ t: t, cx: tr.cx, cy: tr.cy });
        while (tr.hist.length > 2 && t - tr.hist[0].t > 1.2) tr.hist.shift();
        var old = tr.hist[0], span = Math.max(0.3, t - old.t);
        var moved = Math.hypot(tr.cx - old.cx, tr.cy - old.cy) / Math.max(12, tr.box[2]) / span; // box widths per second
        tr.moving = moved > 0.35;
        var fx = tr.cx / W, fy = (tr.box[1] + tr.box[3] * 0.85) / H;   // point near the wheels
        tr.inZone = inPoly(fx, fy, z);
        if (!tr.moving && tr.hits >= 3) tr.still += dt; else tr.still = 0;
        if (tr.inZone && !tr.moving && tr.hits >= 3) tr.dwell += dt * scale();
        else if (tr.moving) tr.dwell = Math.max(0, tr.dwell - dt * scale() * 2);
        if (!tr.flagged && tr.dwell >= thr()) {
          tr.flagged = true;
          // the same parked vehicle is reported only once (short clips replay; IDs can change)
          var again = reported.some(function (r) { return iou(r, tr.box) > 0.35 || Math.hypot(r[0] + r[2] / 2 - tr.cx, r[1] + r[3] / 2 - tr.cy) < Math.max(Math.min(r[2], r[3]) * 0.4, cv.width * 0.03); });   // bikes park side by side
          if (again) tr.already = true; else { reported.push(tr.box.slice()); flag(tr); }
        }
      });
    }

    function fmt(s) { s = Math.round(s); var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
    function draw(clean) {
      var W = cv.width, H = cv.height; if (!W || !vid.videoWidth) return;   // wait until the video has loaded
      ctx.clearRect(0, 0, W, H);
      if (clean) ctx.drawImage(vid, 0, 0, W, H);
      var z = drawing || zone();
      if (z.length) {
        ctx.beginPath(); z.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * W, p[1] * H); else ctx.moveTo(p[0] * W, p[1] * H); });
        if (!drawing) ctx.closePath();
        ctx.fillStyle = 'rgba(255,40,40,.18)'; if (!drawing) ctx.fill();
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.setLineDash(drawing ? [] : [10, 6]); ctx.stroke(); ctx.setLineDash([]);
        if (drawing) z.forEach(function (p) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 6, 0, 7); ctx.fill(); });
        var lp = z[0]; ctx.font = 'bold 15px Times New Roman'; ctx.fillStyle = '#ff5a4d';
        ctx.fillText(drawing ? 'Drawing zone: click corners, then Finish zone' : 'NO PARKING ZONE', lp[0] * W + 4, lp[1] * H - 6);
      }
      tracks.forEach(function (tr) {
        if (tr.hits < 2) return;
        var b = tr.box, col = '#3ddc84', label = (VEH[tr.cls] || tr.cls) + ' ' + Math.round(tr.score * 100) + '% #' + tr.id;
        if (!tr.moving && !tr.inZone) { col = '#5aa0ff'; label = 'stopped · outside zone #' + tr.id; }
        if (tr.inZone && !tr.moving) {
          col = tr.flagged ? '#ff3b30' : tr.dwell > thr() * 0.5 ? '#ffb000' : '#ffe066';
          label = (tr.flagged ? (tr.already ? 'VIOLATION · already reported' : 'VIOLATION · ') : 'in zone · ') + (tr.already ? '' : fmt(tr.dwell)) + ' #' + tr.id;
        }
        ctx.strokeStyle = col; ctx.lineWidth = tr.flagged ? 4 : 2; if (tr.moving) ctx.setLineDash([7, 4]);
        ctx.strokeRect(b[0], b[1], b[2], b[3]); ctx.setLineDash([]);
        ctx.font = 'bold 14px Times New Roman'; var tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = col; ctx.fillRect(b[0], b[1] - 19, tw, 18); ctx.fillStyle = '#000'; ctx.fillText(label, b[0] + 4, b[1] - 5);
        if (tr.inZone && !tr.moving && !tr.flagged) {
          var p = Math.min(1, tr.dwell / thr());
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(b[0], b[1] + b[3] + 3, b[2], 5); ctx.fillStyle = col; ctx.fillRect(b[0], b[1] + b[3] + 3, b[2] * p, 5);
        }
      });
      // HUD
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Times New Roman';
      ctx.fillText((cam ? cam.id + '  ' + cam.name : '') + '   ' + new Date().toLocaleString('en-IN'), 10, 19);
      ctx.fillStyle = '#7CFC9A'; ctx.font = 'bold 13px Times New Roman';
      var tag = 'REAL VIDEO · AI DETECTION'; ctx.fillText(tag, W - ctx.measureText(tag).width - 12, 19);
      var inZ = tracks.filter(function (t) { return t.inZone && !t.moving && t.hits >= 2; }).length;
      main.querySelector('#rcS1').innerHTML = icon('car') + ' Tracking ' + tracks.filter(function (t) { return t.hits >= 2; }).length;
      main.querySelector('#rcS2').innerHTML = icon('alert') + ' Stopped in zone ' + inZ;
      main.querySelector('#rcS3').innerHTML = icon('flag') + ' Filed ' + filed;
      main.querySelector('#rcS4').innerHTML = icon('clock') + ' Video ' + vid.currentTime.toFixed(1) + ' s';
    }

    function flag(tr) {
      // evidence frame: the real video frame + boxes
      var shot = document.createElement('canvas'); shot.width = cv.width; shot.height = cv.height;
      var g = shot.getContext('2d'); g.drawImage(vid, 0, 0, shot.width, shot.height);
      var raw = document.createElement('canvas'); raw.width = cv.width; raw.height = cv.height; raw.getContext('2d').drawImage(vid, 0, 0, raw.width, raw.height);
      g.drawImage(cv, 0, 0);
      var photo = shot.toDataURL('image/jpeg', 0.8);
      var evts = main.querySelector('#rcEvts');
      if (evts.querySelector('.empty')) evts.innerHTML = '';
      var real = Math.round(tr.dwell);
      var row = document.createElement('div'); row.className = 'evt';
      row.innerHTML = '<img src="' + photo + '" alt="frame"><div style="flex:1;min-width:0"><b>' + h(VEH[tr.cls] || tr.cls) + ' #' + tr.id + '</b> stopped ' + Math.floor(real / 60) + ' min ' + (real % 60) + ' s in zone' +
        '<div class="tiny muted">' + h(cam.id) + ' · ' + U.fmtTime(new Date()) + ' · AI ' + Math.round(tr.score * 100) + '%</div><div class="tiny anpr" data-anpr></div><div class="tiny" data-st>' +
        (main.querySelector('#rcAuto').checked ? 'Filing report…' : '<button class="btn sm">File report</button>') + '</div></div>';
      evts.insertBefore(row, evts.firstChild);
      while (evts.children.length > 12) evts.removeChild(evts.lastChild);
      // number plate: try OCR on the vehicle area (works when the vehicle is near the camera)
      var an = row.querySelector('[data-anpr]'), ocr = null, done = Promise.resolve();
      var b = tr.box, W = raw.width, H = raw.height;
      if (window.PlateOCR && PlateOCR.available() && b[2] > W * 0.12) {
        an.innerHTML = '<span class="ocr-spin"></span> Reading number plate…';
        done = PlateOCR.read(raw, { region: { x: Math.max(0, b[0] / W), y: Math.max(0, (b[1] + b[3] * 0.35) / H), w: Math.min(1, b[2] / W), h: Math.min(1, b[3] * 0.65 / H) } })
          .then(function (r) { ocr = r; an.innerHTML = r.plate ? 'Plate read: <b class="mono">' + h(r.plate) + '</b> · ' + r.confidence + '%' : 'Plate not readable — officer to check the photo'; })
          .catch(function () { an.textContent = ''; });
      } else an.textContent = 'Vehicle too far for plate reading — officer to check the photo';
      function file() {
        var st = row.querySelector('[data-st]'); st.textContent = 'Filing report…';
        var z = (meta && meta.noPark.filter(function (n) { return n.id === locSel.value; })[0]) || null;
        var mid = z ? z.path[Math.floor(z.path.length / 2)] : [11.9352, 79.8312];
        done.then(function () {
          return U.api('POST', '/api/violations', { source: 'camera', cameraId: cam.id, type: 'Parking in no-parking zone', plate: ocr && ocr.plate ? ocr.plate : '', plateOcr: ocr && ocr.plate ? ocr.confidence : null,
            vehicle: VEH[tr.cls] === 'Bicycle' ? 'Two-wheeler' : (VEH[tr.cls] || 'Car'), lat: mid[0] + (Math.random() - .5) * 0.0004, lng: mid[1] + (Math.random() - .5) * 0.0004, photo: photo,
            dwell: Math.floor(real / 60) + 'm ' + (real % 60) + 's (real video, AI)' });
        }).then(function (r) { filed++; st.innerHTML = 'Filed <a href="#" data-id="' + r.id + '">' + r.id + '</a> · priority ' + h(r.priority); st.querySelector('a').onclick = function (e) { e.preventDefault(); window.PS03.openViolation(r.id); }; })
          .catch(function (e) { st.textContent = 'Could not file: ' + e.message; });
      }
      if (main.querySelector('#rcAuto').checked) file(); else row.querySelector('button').onclick = file;
    }

    return { destroy: function () { alive = false; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* ignore */ } } };
  }

  window.RealCCTV = { mount: mount, available: function () { return !window.PS_MOBILE; } };
})();
