/*
 * PlateOCR — reads Indian vehicle number plates from a photo, fully offline.
 * Engine: Tesseract (tesseract.js 5, bundled locally in lib/ocr/). No internet, no server.
 *
 *   PlateOCR.read(imageOrCanvasOrDataUrl, { region: {x,y,w,h} (0..1, optional) })
 *     -> Promise<{ plate: 'PY01AB1234' | '', confidence: 0..100, raw: 'text seen', ms }>
 *   PlateOCR.normalize('py 01 ab 1234') -> 'PY01AB1234'
 *   PlateOCR.find('any OCR text') -> { plate, fixes } | null
 */
(function () {
  'use strict';
  var STATES = ['PY', 'TN', 'KA', 'KL', 'AP', 'TS', 'TG', 'MH', 'DL', 'GJ', 'RJ', 'UP', 'MP', 'WB', 'OD', 'OR', 'BR', 'HR', 'PB', 'CH', 'GA', 'JH', 'CG', 'UK', 'HP', 'JK', 'AS', 'ML', 'MN', 'MZ', 'NL', 'TR', 'SK', 'AR', 'AN', 'LD', 'DD', 'DN', 'LA'];
  var TO_DIGIT = { O: '0', Q: '0', D: '0', U: '0', I: '1', L: '1', T: '1', J: '1', Z: '2', S: '5', B: '8', G: '6', A: '4', E: '3' };
  var TO_LETTER = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A', '3': 'E', '7': 'T' };

  function base() {
    var b = window.PLATE_OCR_BASE || 'lib/ocr/';
    try { return new URL(b, location.href).href; } catch (e) { return b; }
  }

  // ---------- text -> plate ----------
  function asDigit(c) { return /[0-9]/.test(c) ? [c, 0] : (TO_DIGIT[c] ? [TO_DIGIT[c], 1] : null); }
  function asLetter(c) { return /[A-Z]/.test(c) ? [c, 0] : (TO_LETTER[c] ? [TO_LETTER[c], 1] : null); }

  // Try to read SS NN L{0,3} NNNN starting at s[i]. Returns best {plate, fixes, len}.
  function parseAt(s, i) {
    var best = null;
    var st1 = asLetter(s[i]), st2 = asLetter(s[i + 1]);
    if (!st1 || !st2) return null;
    var state = st1[0] + st2[0];
    var fixes = st1[1] + st2[1];
    if (STATES.indexOf(state) < 0) fixes += 2;
    for (var dl = 1; dl <= 2; dl++) {
      var d = '', f1 = 0, ok = true;
      for (var k = 0; k < dl; k++) { var x = asDigit(s[i + 2 + k] || ''); if (!x) { ok = false; break; } d += x[0]; f1 += x[1]; }
      if (!ok) continue;
      for (var ll = 0; ll <= 3; ll++) {
        var l = '', f2 = 0; ok = true;
        for (k = 0; k < ll; k++) { x = asLetter(s[i + 2 + dl + k] || ''); if (!x) { ok = false; break; } l += x[0]; f2 += x[1]; }
        if (!ok) continue;
        for (var nl = 4; nl >= 3; nl--) {
          var n = '', f3 = 0; ok = true;
          for (k = 0; k < nl; k++) { x = asDigit(s[i + 2 + dl + ll + k] || ''); if (!x) { ok = false; break; } n += x[0]; f3 += x[1]; }
          if (!ok) continue;
          var total = fixes + f1 + f2 + f3 + (nl === 3 ? 2 : 0) + (dl === 1 ? 1 : 0) + (ll === 0 ? 1 : 0) + (ll === 3 ? 0.5 : 0);
          var cand = { plate: state + (dl === 1 ? '0' + d : d) + l + n, fixes: total, len: 2 + dl + ll + nl };
          if (!best || cand.fixes < best.fixes || (cand.fixes === best.fixes && cand.len > best.len)) best = cand;
        }
      }
    }
    return best;
  }

  // BH series: 22 BH 1234 AB
  function parseBH(s) {
    var m = /([0-9]{2})BH([0-9]{4})([A-Z]{1,2})/.exec(s);
    return m ? { plate: m[1] + 'BH' + m[2] + m[3], fixes: 0, len: m[0].length } : null;
  }

  function find(text) {
    var s = String(text || '').toUpperCase().replace(/IND/g, ' ').replace(/[^A-Z0-9]/g, '');
    if (s.length < 6) return null;
    var best = parseBH(s);
    function consider(c) { if (c && (!best || c.fixes < best.fixes || (c.fixes === best.fixes && c.len > best.len))) best = c; }
    for (var i = 0; i + 6 <= s.length; i++) {
      consider(parseAt(s, i));
      // OCR often adds one stray character (a border line read as I or 1): try without it.
      for (var j = i + 1; j < Math.min(s.length, i + 11); j++) {
        var c2 = parseAt(s.slice(0, j) + s.slice(j + 1), i);
        if (c2) { c2.fixes += 1.5; consider(c2); }
      }
    }
    if (!best || best.fixes > 4) return null;
    best.fixes = Math.round(best.fixes);
    return best;
  }

  function normalize(t) {
    var r = find(t);
    return r ? r.plate : String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // ---------- image helpers ----------
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      if (src instanceof HTMLCanvasElement || src instanceof HTMLImageElement && src.complete) return resolve(src);
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('Could not open the photo')); };
      if (src instanceof Blob) { im.src = URL.createObjectURL(src); } else { im.src = src; }
    });
  }

  // Crop (0..1 region), scale and convert to high-contrast grayscale.
  function prepare(img, region, targetW, mode, clean) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    var r = region || { x: 0, y: 0, w: 1, h: 1 };
    var sx = Math.max(0, r.x * W), sy = Math.max(0, r.y * H), sw = Math.min(W - sx, r.w * W), sh = Math.min(H - sy, r.h * H);
    var scale = Math.min(4, targetW / sw);
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * scale)); c.height = Math.max(1, Math.round(sh * scale));
    var g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    if (mode === 'raw') return c;
    var d = g.getImageData(0, 0, c.width, c.height), p = d.data, n = p.length / 4, hist = new Array(256).fill(0), i;
    for (i = 0; i < p.length; i += 4) { var y = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) | 0; p[i] = y; hist[y]++; }
    // Otsu threshold
    var sum = 0; for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, th = 127;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = n - wB; if (!wF) break;
      sumB += i * hist[i]; var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; th = i; }
    }
    for (i = 0; i < p.length; i += 4) {
      var v = mode === 'gray' ? p[i] : (p[i] > th ? 255 : 0);
      p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
    }
    if (clean) {
      // remove dark areas touching the edge (car body, shadows) so only the plate text is left
      var w = c.width, hh = c.height, dark = new Uint8Array(w * hh), st = [], k;
      for (k = 0; k < w * hh; k++) dark[k] = p[k * 4] <= th ? 1 : 0;
      for (var x0 = 0; x0 < w; x0++) { st.push(x0, (hh - 1) * w + x0); }
      for (var y0 = 0; y0 < hh; y0++) { st.push(y0 * w, y0 * w + w - 1); }
      while (st.length) {
        k = st.pop(); if (!dark[k]) continue; dark[k] = 0;
        p[k * 4] = p[k * 4 + 1] = p[k * 4 + 2] = 255;
        var xx = k % w;
        if (xx > 0) st.push(k - 1); if (xx < w - 1) st.push(k + 1); if (k >= w) st.push(k - w); if (k < w * (hh - 1)) st.push(k + w);
      }
      // straighten a tilted plate: pick the angle that gives the sharpest row profile
      var best = 0, bestV = -1, pts = [];
      for (k = 0; k < w * hh; k += 3) if (dark[k]) pts.push(k);
      if (pts.length > 50) {
        for (var a = -10; a <= 10; a += 2) {
          var rad = a * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad), rows = new Float32Array(hh * 2 + 2), sum = 0, sq = 0;
          for (var j = 0; j < pts.length; j++) { var px = pts[j] % w, py = (pts[j] - px) / w; var r = Math.round(py * cs - px * sn + hh * 0.5 + w * Math.abs(sn) * 0.5); if (r >= 0 && r < rows.length) rows[r]++; }
          for (j = 0; j < rows.length; j++) { sum += rows[j]; sq += rows[j] * rows[j]; }
          var vv = sq / rows.length - (sum / rows.length) * (sum / rows.length);
          if (vv > bestV) { bestV = vv; best = a; }
        }
      }
      g.putImageData(d, 0, 0);
      if (best !== 0) {
        var c2 = document.createElement('canvas'); c2.width = w; c2.height = hh;
        var g2 = c2.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, w, hh);
        g2.translate(w / 2, hh / 2); g2.rotate(-best * Math.PI / 180); g2.drawImage(c, -w / 2, -hh / 2);
        c = c2;
      }
      return c;
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  // ---------- find the number plate in a photo ----------
  // Plates are bright rectangles (white / yellow) with a row of dark characters.
  // Returns up to 4 candidate regions (0..1 coordinates), best first.
  function locate(img) {
    var W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height;
    var w = 480, h = Math.max(1, Math.round(H0 * w / W0));
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    var p = g.getImageData(0, 0, w, h).data, n = w * h, gray = new Uint8Array(n), i;
    for (i = 0; i < n; i++) gray[i] = (p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114) | 0;
    var out = [];
    // try a few brightness cut-offs: the plate is one of the brightest objects
    var sorted = Array.prototype.slice.call(gray).sort(function (a, b) { return a - b; });
    var cuts = [sorted[Math.floor(n * 0.80)], sorted[Math.floor(n * 0.90)], sorted[Math.floor(n * 0.70)], 150];
    var seenCut = {};
    cuts.forEach(function (th) {
      th = Math.max(90, Math.min(235, th)); if (seenCut[th]) return; seenCut[th] = 1;
      var lab = new Int32Array(n), stack = [], comp = 0;
      for (var s0 = 0; s0 < n; s0++) {
        if (lab[s0] || gray[s0] < th) continue;
        comp++; var minx = w, miny = h, maxx = 0, maxy = 0, area = 0;
        stack.length = 0; stack.push(s0); lab[s0] = comp;
        while (stack.length) {
          var k = stack.pop(), x = k % w, y = (k - x) / w; area++;
          if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
          if (x > 0 && !lab[k - 1] && gray[k - 1] >= th) { lab[k - 1] = comp; stack.push(k - 1); }
          if (x < w - 1 && !lab[k + 1] && gray[k + 1] >= th) { lab[k + 1] = comp; stack.push(k + 1); }
          if (y > 0 && !lab[k - w] && gray[k - w] >= th) { lab[k - w] = comp; stack.push(k - w); }
          if (y < h - 1 && !lab[k + w] && gray[k + w] >= th) { lab[k + w] = comp; stack.push(k + w); }
        }
        var bw = maxx - minx + 1, bh = maxy - miny + 1, ar = bw / bh;
        if (bw < w * 0.06 || bh < 6 || ar < 1.4 || ar > 8 || bw > w * 0.95 || bh > h * 0.6) continue;
        var fill = area / (bw * bh);
        if (fill < 0.35) continue;
        // count dark/bright changes along 3 horizontal lines (characters make many)
        var trans = 0;
        [0.4, 0.5, 0.6].forEach(function (f) {
          var yy = Math.round(miny + bh * f), prev = -1;
          for (var xx = minx; xx <= maxx; xx++) { var v = gray[yy * w + xx] >= th ? 1 : 0; if (prev >= 0 && v !== prev) trans++; prev = v; }
        });
        trans /= 3;
        if (trans < 6) continue;
        var score = Math.min(trans, 30) * (1 - Math.abs(fill - 0.7)) * (ar > 2 && ar < 6 ? 1.3 : 1);
        var padX = bw * 0.06, padY = bh * 0.18;
        out.push({ score: score, region: { x: Math.max(0, (minx - padX) / w), y: Math.max(0, (miny - padY) / h), w: Math.min(1, (bw + 2 * padX) / w), h: Math.min(1, (bh + 2 * padY) / h) } });
      }
    });
    out.sort(function (a, b) { return b.score - a.score; });
    var res = [];
    out.forEach(function (o) {
      var dup = res.some(function (r) { return Math.abs(r.x - o.region.x) < 0.03 && Math.abs(r.y - o.region.y) < 0.03; });
      if (!dup && res.length < 4) res.push(o.region);
    });
    return res;
  }

  // ---------- engine ----------
  var workerP = null;
  function engine() {
    if (!window.Tesseract) return Promise.reject(new Error('OCR engine not loaded'));
    if (!workerP) {
      var b = base();
      workerP = Tesseract.createWorker('eng', 1, {
        workerPath: b + 'worker.min.js', corePath: b, langPath: b, gzip: true, cacheMethod: 'none',
        workerBlobURL: window.PLATE_OCR_BLOB !== false
      }).then(function (w) {
        return w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', preserve_interword_spaces: '0' }).then(function () { return w; });
      });
      workerP.catch(function () { workerP = null; });
    }
    return workerP;
  }

  // Start loading the engine early (e.g. when a report page opens) so the first read is quick.
  function warm() { if (window.Tesseract && window.PLATE_OCR_OFF !== true) engine().catch(function () {}); }

  function read(src, opts) {
    opts = opts || {};
    var t0 = Date.now(), seen = [];
    return Promise.all([loadImage(src), engine()]).then(function (r) {
      var img = r[0], w = r[1];
      var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      // Attempts from cheap/likely to wider. Stop at the first good plate.
      var tries = [];
      if (opts.region) {
        tries.push({ region: opts.region, tw: 900, mode: 'bin', psm: '7', clean: true });
        tries.push({ region: opts.region, tw: 900, mode: 'bin', psm: '7' });
        tries.push({ region: opts.region, tw: 900, mode: 'gray', psm: '7' });
        tries.push({ region: opts.region, tw: 1200, mode: 'gray', psm: '6' });
      } else {
        var cands = [];
        try { cands = locate(img); } catch (e) { cands = []; }
        cands.forEach(function (rg) {
          tries.push({ region: rg, tw: 900, mode: 'bin', psm: '7', clean: true });
          tries.push({ region: rg, tw: 900, mode: 'gray', psm: '7', clean: true });
        });
        tries.push({ region: null, tw: Math.min(1600, Math.max(900, W)), mode: 'gray', psm: '3' });
        tries.push({ region: null, tw: Math.min(1600, Math.max(900, W)), mode: 'bin', psm: '3' });
        tries.push({ region: { x: 0.15, y: 0.35, w: 0.7, h: 0.6 }, tw: 1400, mode: 'gray', psm: '3' });
        tries.push({ region: { x: 0.2, y: 0.45, w: 0.6, h: 0.5 }, tw: 2200, mode: 'bin', psm: '3' });
      }
      var best = null;
      function step(k) {
        if (k >= tries.length) return Promise.resolve();
        var t = tries[k];
        var c = prepare(img, t.region, t.tw, t.mode, t.clean);
        return w.setParameters({ tessedit_pageseg_mode: t.psm }).then(function () { return w.recognize(c); }).then(function (res) {
          var text = (res.data.text || '').replace(/\s+/g, ' ').trim();
          seen.push(text);
          var f = find(text);
          if (f) {
            var conf = Math.max(0, Math.round((res.data.confidence || 0) - f.fixes * 8));
            if (!best || f.fixes < best.fixes || (f.fixes === best.fixes && conf > best.confidence)) best = { plate: f.plate, fixes: f.fixes, confidence: conf };
            if (f.fixes <= 1 && conf >= 80) return;
          }
          return step(k + 1);
        });
      }
      return step(0).then(function () {
        return { plate: best ? best.plate : '', confidence: best ? best.confidence : 0, raw: seen.join(' | ').slice(0, 200), ms: Date.now() - t0 };
      });
    });
  }

  function available() { return !!window.Tesseract && window.PLATE_OCR_OFF !== true; }

  /*
   * attach({ img, input, status, onResult })
   *  Reads the plate from <img> as soon as it is attached and fills <input>.
   *  Tapping the photo reads again from the tapped spot (useful when the plate is small).
   *  status: an element that shows what is happening (gets data-ocr-state = busy | ok | fail).
   */
  function attach(o) {
    if (!available() || !o || !o.img) { if (o && o.status) o.status.style.display = 'none'; return; }
    var img = o.img, input = o.input, st = o.status, runId = 0;
    function show(state, html) { if (!st) return; st.style.display = ''; st.setAttribute('data-ocr-state', state); st.innerHTML = html; }
    function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function run(region) {
      var my = ++runId;
      show('busy', '<span class="ocr-spin"></span> Reading the number plate' + (region ? ' at the spot you tapped' : '') + '…');
      read(img, { region: region }).then(function (r) {
        if (my !== runId) return;
        if (r.plate) {
          if (input && (!input.value || input.getAttribute('data-ocr') || region)) {
            input.value = r.plate; input.setAttribute('data-ocr', String(r.confidence));
            try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* old browser */ }
          }
          show('ok', 'Number plate read from photo: <b class="mono">' + esc(r.plate) + '</b> <span class="ocr-conf">' + r.confidence + '% sure</span> · please check it. <span class="ocr-hint">Wrong? Tap the plate in the photo or type it.</span>');
        } else {
          show('fail', 'Could not read the number plate. <b>Tap on the plate in the photo</b> to try again, or type it.');
        }
        if (o.onResult) o.onResult(r);
      }).catch(function (e) {
        if (my !== runId) return;
        show('fail', 'Number plate reader not available here (' + esc(e.message || e) + '). Type the number instead.');
      });
    }
    img.style.cursor = 'crosshair';
    img.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var rc = img.getBoundingClientRect();
      var fx = (e.clientX - rc.left) / rc.width, fy = (e.clientY - rc.top) / rc.height;
      var w = 0.5, h = 0.22;
      run({ x: Math.min(1 - w, Math.max(0, fx - w / 2)), y: Math.min(1 - h, Math.max(0, fy - h / 2)), w: w, h: h });
    });
    if (input) input.addEventListener('input', function (e) { if (e.isTrusted) input.removeAttribute('data-ocr'); });
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', function () { run(); }, { once: true });
  }

  window.PlateOCR = { locate: locate, read: read, warm: warm, find: find, normalize: normalize, prepare: prepare, attach: attach, available: available };
})();
