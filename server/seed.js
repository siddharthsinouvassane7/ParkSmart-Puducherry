// Demo data for the Smart Parking, Traffic Enforcement & Citizen Reporting prototype.
// All data is SIMULATED. Locations are approximate.
'use strict';
const rng = require('./rng');
const { hashPassword } = require('./core');

// Hourly demand shapes (fraction of capacity, hour 0..23)
const PROFILES = {
  market:  [.10,.06,.05,.05,.08,.20,.40,.58,.72,.85,.93,.96,.92,.86,.82,.84,.90,.95,.97,.93,.80,.55,.30,.16],
  beach:   [.12,.08,.06,.06,.20,.45,.55,.40,.30,.28,.30,.32,.30,.30,.38,.55,.80,.96,.99,.97,.88,.65,.35,.18],
  transit: [.30,.25,.22,.25,.40,.62,.80,.90,.92,.88,.80,.76,.74,.74,.78,.82,.88,.92,.90,.82,.70,.58,.45,.35],
  temple:  [.05,.04,.04,.10,.35,.70,.85,.80,.65,.55,.50,.45,.40,.35,.38,.50,.70,.88,.92,.85,.60,.30,.12,.06],
  office:  [.05,.04,.04,.04,.05,.10,.25,.55,.85,.95,.97,.96,.92,.93,.95,.93,.85,.60,.35,.20,.12,.08,.06,.05],
  hospital:[.45,.40,.38,.38,.42,.55,.70,.85,.95,.98,.98,.96,.92,.90,.90,.88,.85,.80,.75,.70,.62,.55,.50,.48]
};

const LOTS = [
  { id: 'L01', name: 'Goubert Market Parking', area: 'Nehru St / MG Road', zone: 'Central Market', type: 'Surface', lat: 11.93555, lng: 79.82935, cap: { car: 60, bike: 220 }, rate: { car: 20, bike: 5 }, hours: '06:00–23:00', profile: 'market', features: ['CCTV', 'Attendant'] },
  { id: 'L02', name: 'Gandhi Thidal / Beach Road Parking', area: 'Goubert Avenue', zone: 'White Town', type: 'On-street (marked bays)', lat: 11.93210, lng: 79.83545, cap: { car: 45, bike: 150 }, rate: { car: 30, bike: 10 }, hours: '05:00–23:00', profile: 'beach', features: ['CCTV', 'Accessible bays'] },
  { id: 'L03', name: 'Bharathi Park East Parking', area: 'Rue Saint Louis', zone: 'White Town', type: 'Surface', lat: 11.93390, lng: 79.83470, cap: { car: 35, bike: 90 }, rate: { car: 20, bike: 5 }, hours: '06:00–22:00', profile: 'beach', features: ['Attendant'] },
  { id: 'L04', name: 'Aurobindo Ashram Visitor Parking', area: 'Marine Street', zone: 'White Town', type: 'Surface', lat: 11.93690, lng: 79.83410, cap: { car: 30, bike: 120 }, rate: { car: 20, bike: 5 }, hours: '06:00–21:00', profile: 'temple', features: ['Attendant'] },
  { id: 'L05', name: 'Manakula Vinayagar Temple Parking', area: 'Manakula Vinayagar St', zone: 'White Town', type: 'Surface', lat: 11.93610, lng: 79.83290, cap: { car: 25, bike: 140 }, rate: { car: 20, bike: 5 }, hours: '05:00–22:00', profile: 'temple', features: ['CCTV'] },
  { id: 'L06', name: 'Mission Street Multi-level Car Park', area: 'Mission Street', zone: 'Central Market', type: 'Multi-level', lat: 11.93720, lng: 79.83050, cap: { car: 180, bike: 300 }, rate: { car: 30, bike: 10 }, hours: '24 hours', profile: 'market', features: ['CCTV', 'EV charging', 'Covered', 'Accessible bays'] },
  { id: 'L07', name: 'New Bus Stand Parking', area: 'Maraimalai Adigal Salai', zone: 'Transit Hub', type: 'Surface', lat: 11.93520, lng: 79.81880, cap: { car: 80, bike: 400 }, rate: { car: 20, bike: 5 }, hours: '24 hours', profile: 'transit', features: ['CCTV', 'Attendant'] },
  { id: 'L08', name: 'Railway Station Parking', area: 'Subbaiah Salai', zone: 'Transit Hub', type: 'Surface', lat: 11.92690, lng: 79.83080, cap: { car: 70, bike: 300 }, rate: { car: 20, bike: 5 }, hours: '24 hours', profile: 'transit', features: ['CCTV', 'Attendant'] },
  { id: 'L09', name: 'Botanical Garden Parking', area: 'West Boulevard', zone: 'South', type: 'Surface', lat: 11.92990, lng: 79.82710, cap: { car: 40, bike: 120 }, rate: { car: 20, bike: 5 }, hours: '08:00–20:00', profile: 'beach', features: [] },
  { id: 'L10', name: 'General Hospital Visitor Parking', area: 'Victor Simonel Street', zone: 'White Town', type: 'Surface', lat: 11.93060, lng: 79.83300, cap: { car: 40, bike: 200 }, rate: { car: 10, bike: 5 }, hours: '24 hours', profile: 'hospital', features: ['Accessible bays'] },
  { id: 'L11', name: 'Sacred Heart Basilica Parking', area: 'South Boulevard', zone: 'South', type: 'Surface', lat: 11.92600, lng: 79.82880, cap: { car: 30, bike: 100 }, rate: { car: 10, bike: 5 }, hours: '06:00–21:00', profile: 'temple', features: [] },
  { id: 'L12', name: 'Rajiv Gandhi Square Park & Ride', area: 'ECR / Rajiv Gandhi Square', zone: 'North', type: 'Surface', lat: 11.95310, lng: 79.82020, cap: { car: 120, bike: 250 }, rate: { car: 10, bike: 5 }, hours: '24 hours', profile: 'office', features: ['Shuttle to White Town', 'EV charging'] },
  { id: 'L13', name: 'Mudaliarpet Market Parking', area: 'Cuddalore Road', zone: 'South', type: 'Surface', lat: 11.91780, lng: 79.81730, cap: { car: 35, bike: 180 }, rate: { car: 10, bike: 5 }, hours: '06:00–22:00', profile: 'market', features: [] },
  { id: 'L14', name: 'Indira Gandhi Square Parking', area: 'Villianur Road', zone: 'North', type: 'Surface', lat: 11.94020, lng: 79.81240, cap: { car: 50, bike: 160 }, rate: { car: 10, bike: 5 }, hours: '06:00–22:00', profile: 'office', features: ['CCTV'] }
];

// No-parking stretches (approximate polylines)
const NOPARK = [
  { id: 'N1', name: 'Mission Street (Cathedral St)', zone: 'Central Market', reason: 'Narrow commercial street, bus route', path: [[11.9318, 79.8313], [11.9352, 79.8312], [11.9390, 79.8311]] },
  { id: 'N2', name: 'Jawaharlal Nehru Street', zone: 'Central Market', reason: 'Main shopping street', path: [[11.9369, 79.8262], [11.9370, 79.8295], [11.9371, 79.8330], [11.9372, 79.8348]] },
  { id: 'N3', name: 'Mahatma Gandhi Road', zone: 'Central Market', reason: 'Arterial road, market frontage', path: [[11.9300, 79.8297], [11.9340, 79.8296], [11.9395, 79.8295], [11.9430, 79.8294]] },
  { id: 'N4', name: 'Goubert Avenue (Beach Road)', zone: 'White Town', reason: 'Promenade, pedestrian priority 17:00–07:00', path: [[11.9275, 79.8361], [11.9310, 79.8358], [11.9350, 79.8355], [11.9392, 79.8352]] },
  { id: 'N5', name: 'Bus Stand Frontage', zone: 'Transit Hub', reason: 'Bus entry/exit, auto stand', path: [[11.9347, 79.8170], [11.9352, 79.8186], [11.9359, 79.8202]] },
  { id: 'N6', name: 'Railway Station Approach', zone: 'Transit Hub', reason: 'Drop-off only', path: [[11.9262, 79.8293], [11.9270, 79.8310], [11.9278, 79.8326]] },
  { id: 'N7', name: 'Anna Salai (Kamaraj Salai junction)', zone: 'North', reason: 'Junction within 50 m', path: [[11.9405, 79.8225], [11.9410, 79.8245], [11.9415, 79.8262]] },
  { id: 'N8', name: 'Hospital Road (Victor Simonel St)', zone: 'White Town', reason: 'Ambulance access', path: [[11.9296, 79.8321], [11.9306, 79.8334], [11.9316, 79.8346]] }
];

const LANDMARKS = [
  { name: 'Rock Beach / Gandhi Statue', lat: 11.9325, lng: 79.8356 },
  { name: 'Goubert Market', lat: 11.9355, lng: 79.8293 },
  { name: 'New Bus Stand', lat: 11.9352, lng: 79.8188 },
  { name: 'Railway Station', lat: 11.9269, lng: 79.8308 },
  { name: 'Sri Aurobindo Ashram', lat: 11.9367, lng: 79.8343 },
  { name: 'Manakula Vinayagar Temple', lat: 11.9358, lng: 79.8350 },
  { name: 'Botanical Garden', lat: 11.9297, lng: 79.8270 },
  { name: 'Sacred Heart Basilica', lat: 11.9258, lng: 79.8288 },
  { name: 'Rajiv Gandhi Square', lat: 11.9531, lng: 79.8202 },
  { name: 'Mudaliarpet', lat: 11.9178, lng: 79.8173 }
];

const VTYPES = [
  { type: 'Parking in no-parking zone', fine: 500, blocking: false },
  { type: 'Parking on footpath', fine: 500, blocking: true },
  { type: 'Double parking', fine: 1000, blocking: true },
  { type: 'Blocking gate / driveway', fine: 500, blocking: true },
  { type: 'Parking near junction / zebra crossing', fine: 500, blocking: true },
  { type: 'Obstructing bus stop', fine: 1000, blocking: true },
  { type: 'Wrong-side parking', fine: 500, blocking: false },
  { type: 'Abandoned vehicle', fine: 1000, blocking: false }
];

const UNITS = ['Traffic North', 'Traffic South', 'Traffic East', 'Traffic West'];
const ZONE_UNIT = { 'Central Market': 'Traffic East', 'White Town': 'Traffic East', 'Transit Hub': 'Traffic West', 'North': 'Traffic North', 'South': 'Traffic South' };

function plate(r) {
  const st = r.weighted(['PY', 'TN', 'KA', 'KL'], [80, 16, 2, 2]);
  const d = st === 'PY' ? r.pick(['01', '01', '01', '05', '02', '04']) : String(r.int(1, 99)).padStart(2, '0');
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const s = L[r.int(0, L.length - 1)] + (r.chance(.7) ? L[r.int(0, L.length - 1)] : '');
  return st + d + s + String(r.int(1, 9999)).padStart(4, '0');
}

function seed() {
  const r = rng(20261013);
  const now = Date.now();
  const lots = LOTS.map(function (l) {
    const hr = new Date().getHours();
    const f = PROFILES[l.profile][hr];
    return Object.assign({}, l, { status: 'open', occ: { car: Math.round(l.cap.car * f * (0.9 + r() * 0.15)), bike: Math.round(l.cap.bike * f * (0.85 + r() * 0.2)) } });
  });
  lots.forEach(function (l) { l.occ.car = Math.min(l.cap.car, l.occ.car); l.occ.bike = Math.min(l.cap.bike, l.occ.bike); });

  // repeat offenders
  const repeaters = []; for (let i = 0; i < 14; i++) repeaters.push(plate(r));

  // hotspot weights per stretch
  const spotW = { N1: 20, N2: 18, N3: 16, N4: 14, N5: 10, N6: 7, N7: 6, N8: 9 };
  const hourW = [1,1,1,1,1,2,4,7,10,12,14,14,12,10,9,10,13,16,18,17,13,8,4,2];
  const viol = [];
  const DAYS = 45;
  let seq = 1;
  for (let d = DAYS; d >= 0; d--) {
    const n = d === 0 ? r.int(14, 20) : r.int(18, 34);
    for (let k = 0; k < n; k++) {
      const hour = r.weighted([...Array(24).keys()], hourW);
      const t = new Date(now - d * 86400000); t.setHours(hour, r.int(0, 59), r.int(0, 59), 0);
      if (t.getTime() > now) continue;
      const npId = r.weighted(Object.keys(spotW), Object.values(spotW));
      const np = NOPARK.find(z => z.id === npId);
      const seg = r.int(0, np.path.length - 2);
      const a = np.path[seg], b = np.path[seg + 1], f = r();
      const lat = a[0] + (b[0] - a[0]) * f + (r() - .5) * 0.0004, lng = a[1] + (b[1] - a[1]) * f + (r() - .5) * 0.0004;
      const vt = r.weighted(VTYPES, [34, 14, 16, 9, 9, 6, 8, 4]);
      const source = r.weighted(['citizen', 'camera', 'officer'], [52, 28, 20]);
      const pl = r.chance(.055) ? r.pick(repeaters) : plate(r);
      const ts = t.getTime();
      const v = { id: 'V' + String(seq++).padStart(5, '0'), ts: new Date(ts).toISOString(), source: source, type: vt.type, plate: pl, vehicle: r.weighted(['Car', 'Two-wheeler', 'Auto', 'Van', 'Truck'], [45, 35, 10, 6, 4]),
        lat: +lat.toFixed(6), lng: +lng.toFixed(6), place: np.name, zone: np.zone, unit: ZONE_UNIT[np.zone], desc: '', photo: null, cameraId: source === 'camera' ? 'CAM-' + np.id : null,
        status: 'New', fine: 0, history: [{ at: new Date(ts).toISOString(), by: source === 'citizen' ? 'Citizen' : source === 'camera' ? 'CCTV auto-detect' : 'Traffic SI', action: 'Reported' }] };
      const ageH = (now - ts) / 3600000;
      if (ageH > 3 || (ageH > .7 && r.chance(.6))) {
        const resp = Math.max(6, Math.round(Math.exp(r.normal(3.3, 0.5)))); // minutes
        const at1 = new Date(ts + resp * 60000).toISOString();
        v.history.push({ at: at1, by: 'Traffic SI', action: 'Verified on spot' });
        v.respMin = resp;
        const outcome = r.weighted(['Challan issued', 'Warned', 'Rejected', 'Duplicate', 'Towed'], [56, 11, 12, 8, 6]);
        v.status = outcome;
        if (outcome === 'Challan issued' || outcome === 'Towed') v.fine = vt.fine + (outcome === 'Towed' ? 500 : 0);
        if (outcome === 'Rejected') v.history[1].action = 'Checked on spot';
        v.history.push({ at: new Date(ts + (resp + r.int(2, 15)) * 60000).toISOString(), by: 'Traffic SI', action: outcome, remarks: outcome === 'Rejected' ? r.pick(['Vehicle not found at spot', 'Vehicle was in legal bay', 'Photo unclear']) : outcome === 'Duplicate' ? 'Already reported' : '' });
        v.paid = v.fine ? r.chance(.62) : false;
      } else if (ageH > .4 && r.chance(.5)) {
        v.status = 'Verified'; v.history.push({ at: new Date(ts + 20 * 60000).toISOString(), by: 'Traffic SI', action: 'Verified on spot' });
      }
      viol.push(v);
    }
  }
  viol.sort((x, y) => x.ts < y.ts ? 1 : -1);

  const users = [
    { username: 'admin', password: hashPassword('Admin@123'), name: 'SP (Traffic)', title: 'Superintendent of Police, Traffic', role: 'admin' },
    { username: 'traffic', password: hashPassword('Officer@123'), name: 'SI Traffic East', title: 'Sub-Inspector, Traffic East', role: 'officer', unit: 'Traffic East' },
    { username: 'attendant', password: hashPassword('Lot@123'), name: 'Lot Attendant', title: 'Attendant – Goubert Market', role: 'attendant', lotId: 'L01' }
  ];
  return { version: 1, demo: true, anchor: now, sim: true, lots: lots, noPark: NOPARK, landmarks: LANDMARKS, vtypes: VTYPES, units: UNITS, zoneUnit: ZONE_UNIT, violations: viol, seq: seq, users: users, audit: [], profiles: PROFILES };
}

module.exports = { seed: seed, PROFILES: PROFILES, VTYPES: VTYPES };
