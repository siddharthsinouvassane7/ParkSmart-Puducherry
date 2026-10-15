// Self-test for ParkSmart (PS-03). Starts a private copy of the server with fresh demo data and checks every feature.
'use strict';
const kit = require('./testkit')('ParkSmart self-test');
const build = require('./server');
process.env.NO_BROWSER = '1';
const { check, call } = kit;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async function () {
  console.log('\n  ParkSmart Puducherry (PS-03) — self-test\n');
  const app = build({ dataDir: kit.tmpDir(), port: 5090, tickMs: 300 });
  const port = await new Promise(function (res) { app.start(res); });
  kit.setPort(port);
  try {
    // public parking
    let r = await call('GET', '/api/lots');
    check('Parking lots load (public)', r.status === 200 && r.body.length >= 10);
    const lot = r.body[0];
    check('Each lot has free slots and forecast', lot.free && typeof lot.nextPct === 'number' && lot.cap.car > 0);
    r = await call('GET', '/api/lots/' + lot.id + '/forecast');
    check('Best-time forecast has 24 hours', r.status === 200 && r.body.hours.length === 24 && r.body.best != null);
    r = await call('GET', '/api/meta');
    check('No-parking stretches and landmarks load', r.body.noPark.length >= 6 && r.body.landmarks.length >= 6 && r.body.vtypes.length >= 6);
    const occBefore = JSON.stringify((await call('GET', '/api/lots')).body.map(l => l.occ));
    await new Promise(res => setTimeout(res, 1200));
    const occAfter = JSON.stringify((await call('GET', '/api/lots')).body.map(l => l.occ));
    check('Live sensor simulation changes occupancy', occBefore !== occAfter);

    // citizen report
    r = await call('POST', '/api/report', { type: 'Double parking', lat: 11.9352, lng: 79.8312, plate: 'py 01 ab 1234', vehicle: 'Car', desc: 'Test', photo: PNG });
    check('Citizen can report without login', r.status === 200 && /^V\d{5}$/.test(r.body.id), JSON.stringify(r.body));
    const rid = r.body.id;
    check('Report is matched to the street (Mission Street)', /Mission/.test(r.body.place), r.body.place);
    check('Blocking violation gets priority', ['High', 'Medium'].indexOf(r.body.priority) >= 0);
    r = await call('POST', '/api/report', { type: 'Double parking', lat: 11.93522, lng: 79.83121, plate: 'PY01AB1234' });
    check('Same vehicle again within 30 min is flagged as possible duplicate', r.body.dupOf === rid, JSON.stringify(r.body));
    r = await call('POST', '/api/report', { type: 'Parking on footpath', lat: 11.9301, lng: 79.8352, plate: 'TN09BX4521', plateOcr: 93 });
    const ocrId = r.body.id;
    r = await call('POST', '/api/report', { type: 'Double parking', lat: 13.08, lng: 80.27 });
    check('Location outside Puducherry is rejected', r.status === 400);
    r = await call('POST', '/api/report', { type: 'Something else', lat: 11.93, lng: 79.83 });
    check('Unknown violation type is rejected', r.status === 400);
    r = await call('POST', '/api/report', { type: 'Double parking', lat: 11.93, lng: 79.83, plate: '12345' });
    check('Bad vehicle number is rejected', r.status === 400);
    r = await call('GET', '/api/track/' + rid.toLowerCase());
    check('Citizen can track report by ID', r.status === 200 && r.body.status === 'New' && r.body.history.length >= 1);
    check('Tracking hides full vehicle number', r.body.plate && r.body.plate.indexOf('••') > 0);

    // security
    r = await call('GET', '/api/violations');
    check('Violation queue needs police login', r.status === 401);
    r = await kit.login('admin', 'wrong');
    check('Wrong password refused', r.status === 401);
    r = await kit.login('attendant', 'Lot@123');
    check('Attendant can log in', r.status === 200 && r.body.user.role === 'attendant');
    r = await call('GET', '/api/violations');
    check('Attendant cannot open violation queue', r.status === 403);
    r = await call('POST', '/api/lots/L02/count', { kind: 'car', delta: 1 });
    check('Attendant cannot change another lot', r.status === 403);
    const l1 = (await call('GET', '/api/lots')).body.find(l => l.id === 'L01');
    r = await call('POST', '/api/lots/L01/count', { kind: 'bike', delta: l1.occ.bike >= l1.cap.bike ? -1 : 1 });
    check('Attendant gate counter updates own lot', r.status === 200 && r.body.occ.bike !== l1.occ.bike);

    // officer workflow
    r = await kit.login('traffic', 'Officer@123');
    check('Traffic officer can log in', r.status === 200);
    r = await call('GET', '/api/violations?status=open&days=1');
    check('Open queue includes the new citizen report', r.body.items.some(v => v.id === rid));
    r = await call('GET', '/api/violations/' + rid);
    check('Report detail shows photo evidence with SHA-256', r.body.photo && /^[0-9a-f]{64}$/.test(r.body.photoHash));
    r = await call('POST', '/api/violations/' + rid + '/action', { action: 'reject' });
    check('Reject without reason is refused', r.status === 400);
    r = await call('POST', '/api/violations/' + rid + '/action', { action: 'verify' });
    check('Officer verifies report', r.body.status === 'Verified');
    r = await call('POST', '/api/violations/' + rid + '/action', { action: 'challan', fine: 1000 });
    check('Officer issues challan', r.body.status === 'Challan issued' && r.body.fine === 1000 && r.body.challanNo);
    r = await call('POST', '/api/violations/' + rid + '/action', { action: 'warn' });
    check('Closed report cannot be changed again', r.status === 400);
    r = await call('POST', '/api/violations/' + rid + '/action', { action: 'paid' });
    check('Fine can be marked paid', r.body.paid === true);
    r = await call('GET', '/api/track/' + rid);
    check('Citizen sees the challan in tracking', r.body.status === 'Challan issued');
    r = await call('POST', '/api/violations', { source: 'camera', cameraId: 'CAM-N1', type: 'Parking in no-parking zone', plate: 'PY01CD4321', lat: 11.9352, lng: 79.8312, photo: PNG, dwell: '2m 10s' });
    check('CCTV auto-detection files a violation', r.status === 200 && r.body.source === 'camera' && /dwell/.test(r.body.history[0].action));
    r = await call('POST', '/api/lots/L01', {});
    check('Unknown API path handled', r.status === 404);
    r = await call('PUT', '/api/lots/L01', { cap: { car: 70 } });
    check('Only admin can edit lot capacity', r.status === 403);
    r = await call('POST', '/api/sim', { on: false });
    check('Only admin can switch simulation', r.status === 403);

    // dashboard & analytics
    r = await call('GET', '/api/dashboard');
    check('Dashboard KPIs load', r.status === 200 && r.body.kpi.capCar > 0 && r.body.zones.length >= 4);
    check('Dashboard gives recommendations', r.body.recs.length >= 3);
    r = await call('GET', '/api/analytics?days=30');
    check('Analytics: 30 days of data', r.body.total > 300 && Object.keys(r.body.daily).length === 30);
    check('Analytics: day x hour matrix', r.body.matrix.length === 7 && r.body.matrix[0].length === 24);
    check('Analytics: channel reliability', r.body.srcAcc.citizen && r.body.srcAcc.camera);
    r = await call('GET', '/api/offenders');
    check('Repeat offenders found', r.body.length > 3 && r.body[0].n >= 2);
    r = await call('GET', '/api/export.csv');
    check('CSV export works', r.status === 200 && /^id,ts,source/.test(r.body));

    // phone sync import
    const syncFile = { type: 'parksmart-sync', version: 1, device: 'TEST', exportedAt: new Date().toISOString(), violations: [
      { id: 'MAB01170', ts: new Date().toISOString(), source: 'citizen', type: 'Double parking', plate: 'PY01ZZ1111', vehicle: 'Car', lat: 11.9352, lng: 79.8312, place: 'Mission Street (Cathedral St)', zone: 'Central Market', status: 'New', photo: PNG, history: [{ at: new Date().toISOString(), by: 'Citizen', action: 'Reported' }] },
      { id: 'MAB01171', ts: new Date().toISOString(), source: 'officer', type: 'Parking on footpath', plate: '', lat: 11.9370, lng: 79.8300, status: 'Challan issued', fine: 500, history: [] },
      { id: 'MAB01172', ts: 'bad date', type: 'Double parking', lat: 50, lng: 10 } ] };
    r = await call('POST', '/api/import-sync', { data: syncFile });
    check('Phone sync file imports new reports (invalid ones skipped)', r.status === 200 && r.body.added === 2 && r.body.invalid === 1, JSON.stringify(r.body));
    r = await call('POST', '/api/import-sync', { data: syncFile });
    check('Importing the same sync file twice adds nothing', r.body.added === 0 && r.body.skipped === 2);
    r = await call('GET', '/api/violations/MAB01170');
    check('Imported phone report keeps photo evidence and history', r.status === 200 && /^[0-9a-f]{64}$/.test(r.body.photoHash || '') && r.body.history.some(h => /phone sync/.test(h.action)));
    r = await call('POST', '/api/import-sync', { data: { hello: 1 } });
    check('Wrong file is refused', r.status === 400);

    r = await call('GET', '/api/violations/' + ocrId);
    check('Number read by OCR is saved with its confidence', r.status === 200 && r.body.plate === 'TN09BX4521' && r.body.plateOcr === 93, JSON.stringify(r.body.plateOcr));
    // number plate reader text matching (same code the browser uses)
    {
      const vm = require('vm'), fs = require('fs'), path = require('path');
      const sb = { window: {}, location: { href: 'http://x/' }, URL: URL };
      vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'lib', 'ocr', 'plate-ocr.js'), 'utf8'), sb);
      const P = sb.window.PlateOCR, f = t => (P.find(t) || {}).plate || '';
      check('Plate reader fixes common OCR mistakes', f('PY O1 AB 1Z34') === 'PY01AB1234' && f('TN 09 BX 4521') === 'TN09BX4521' && f('PY 05 C 4321') === 'PY05C4321' && f('IND PY O01 AB 1234') === 'PY01AB1234', [f('PY O1 AB 1Z34'), f('IND PY O01 AB 1234')].join(','));
      check('Plate reader ignores text that is not a number plate', f('NO PARKING ZONE') === '' && f('') === '');
    }
    for (const f of ['/js/realcctv.js', '/lib/ai/tf.min.js', '/lib/ai/coco-ssd.min.js', '/lib/ai/model/model.json', '/lib/ai/model/group1-shard5of5', '/media/cctv/puducherry_whitetown.webm', '/media/cctv/roadside_parking.mp4']) {
      r = await call('GET', f);
      check('Real CCTV file available: ' + f.split('/').pop(), r.status === 200);
    }
    {
      const http = require('http');
      const rr = await new Promise(function (res) { http.get({ host: '127.0.0.1', port: port, path: '/media/cctv/puducherry_whitetown.mp4', headers: { Range: 'bytes=0-99' } }, function (x) { x.resume(); res(x); }); });
      check('Video can be streamed in parts (Range) for the CCTV player', rr.statusCode === 206 && rr.headers['content-length'] === '100' && /video\/mp4/.test(rr.headers['content-type']));
    }
    for (const f of ['/lib/ocr/tesseract.min.js', '/lib/ocr/worker.min.js', '/lib/ocr/plate-ocr.js', '/lib/ocr/eng.traineddata.gz', '/lib/ocr/tesseract-core-simd-lstm.wasm.js']) {
      r = await call('GET', f);
      check('Offline OCR file available: ' + f.split('/').pop(), r.status === 200);
    }

    // admin
    r = await kit.login('admin', 'Admin@123');
    r = await call('PUT', '/api/lots/L03', { status: 'closed', cap: { car: 40 } });
    check('Admin closes a lot / edits capacity', r.body.status === 'closed' && r.body.cap.car === 40);
    r = await call('GET', '/api/audit');
    check('Audit log records actions', r.body.some(a => a.action === 'violation-challan') && r.body.some(a => a.action === 'citizen-report'));
    r = await call('POST', '/api/sim', { on: false });
    check('Admin can pause the simulation', r.body.sim === false);

    // static files
    for (const f of ['/', '/js/app.js', '/js/common.js', '/js/cctv.js', '/css/base.css', '/lib/leaflet/leaflet.js', '/lib/chart.umd.js', '/lib/qrcode.js']) {
      r = await call('GET', f);
      check('Serves ' + f, r.status === 200);
    }
    r = await call('GET', '/../server/core.js');
    check('Cannot read server files through the web', r.status !== 200 || typeof r.body !== 'string' || r.body.indexOf('createApp') < 0);
    r = await call('GET', '/api/netinfo');
    check('Phone address info available', r.status === 200 && r.body.port === port);
  } catch (e) { check('No crash during test', false, e.stack); }
  app.server.close();
  kit.done();
})();
