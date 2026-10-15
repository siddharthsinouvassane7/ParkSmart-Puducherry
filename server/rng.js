// Seeded random helpers (so demo data is the same every time it is generated).
'use strict';
function rng(seed) {
  let a = seed >>> 0;
  const r = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
  r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
  r.chance = function (p) { return r() < p; };
  r.weighted = function (items, weights) { const s = weights.reduce((x, y) => x + y, 0); let v = r() * s; for (let i = 0; i < items.length; i++) { v -= weights[i]; if (v <= 0) return items[i]; } return items[items.length - 1]; };
  r.normal = function (m, sd) { const u = 1 - r(), v = r(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  r.shuffle = function (arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return r;
}
module.exports = rng;
