// Small helper for the self-test scripts.
'use strict';
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
function kit(title) {
  let pass = 0, fail = 0; const failures = [];
  function check(name, cond, extra) {
    if (cond) { pass++; console.log('  [PASS] ' + name); }
    else { fail++; failures.push(name); console.log('  [FAIL] ' + name + (extra ? '  -> ' + extra : '')); }
  }
  let port = 0, cookie = '';
  function call(method, url, body, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      const data = body === undefined ? null : JSON.stringify(body);
      const req = http.request({ host: '127.0.0.1', port: port, path: url, method: method, headers: Object.assign({ 'Content-Type': 'application/json' }, (opts.cookie !== undefined ? opts.cookie : cookie) ? { Cookie: opts.cookie !== undefined ? opts.cookie : cookie } : {}) }, function (res) {
        let s = ''; res.on('data', function (c) { s += c; }); res.on('end', function () {
          const sc = res.headers['set-cookie']; if (sc && !opts.keepCookie) { cookie = sc[0].split(';')[0]; }
          let j = null; try { j = JSON.parse(s); } catch (e) { j = s; }
          resolve({ status: res.statusCode, body: j, headers: res.headers });
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }
  function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pph-test-')); }
  return {
    check: check, call: call, tmpDir: tmpDir,
    setPort: function (p) { port = p; }, setCookie: function (c) { cookie = c; }, getCookie: function () { return cookie; },
    login: async function (u, p) { cookie = ''; const r = await call('POST', '/api/login', { username: u, password: p }); return r; },
    done: function () {
      console.log('');
      console.log('  ===========================================');
      console.log('   ' + title + ': ' + pass + ' passed, ' + fail + ' failed');
      if (fail) console.log('   Failed: ' + failures.join('; '));
      else console.log('   ALL CHECKS PASSED - ready for the demo.');
      console.log('  ===========================================');
      process.exit(fail ? 1 : 0);
    }
  };
}
module.exports = kit;
