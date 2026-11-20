/* RNGdle-style friend code scoring engine (unofficial). Pure functions, no DOM. */
(function (root) {
  'use strict';

  /* ---------- MD5 (for the Wii friend code checksum) ---------- */
  function md5(bytes) {
    var K = new Uint32Array(64);
    var S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    var len = bytes.length;
    var n = (((len + 8) >>> 6) + 1) << 6;
    var buf = new Uint8Array(n);
    buf.set(bytes);
    buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(n - 8, (len * 8) >>> 0, true);
    dv.setUint32(n - 4, Math.floor((len * 8) / 4294967296), true);
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (var o = 0; o < n; o += 64) {
      var M = new Uint32Array(16);
      for (var j = 0; j < 16; j++) M[j] = dv.getUint32(o + j * 4, true);
      var A = a0, B = b0, C = c0, D = d0;
      for (var k = 0; k < 64; k++) {
        var F, g;
        if (k < 16) { F = (B & C) | (~B & D); g = k; }
        else if (k < 32) { F = (D & B) | (~D & C); g = (5 * k + 1) % 16; }
        else if (k < 48) { F = B ^ C ^ D; g = (3 * k + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * k) % 16; }
        F = (F + A + K[k] + M[g]) >>> 0;
        A = D; D = C; C = B;
        var s = S[(k >> 4) * 4 + (k & 3)];
        B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    var out = new Uint8Array(16), odv = new DataView(out.buffer);
    odv.setUint32(0, a0, true); odv.setUint32(4, b0, true); odv.setUint32(8, c0, true); odv.setUint32(12, d0, true);
    return out;
  }

  var REGIONS = [['RMCE', 'North America'], ['RMCP', 'Europe / PAL'], ['RMCJ', 'Japan'], ['RMCK', 'Korea']];

  function chkFor(pid, game) {
    var b = new Uint8Array(8);
    new DataView(b.buffer).setUint32(0, pid, true);
    for (var i = 0; i < 4; i++) b[4 + i] = game.charCodeAt(3 - i);
    return md5(b)[0] >> 1;
  }
  /* Builds a structurally valid 12-digit code from a 32-bit profile ID. */
  function build(pid, game) {
    return String(chkFor(pid, game || 'RMCE') * 4294967296 + pid).padStart(12, '0');
  }
  /* Returns the region names whose game ID produces this code's checksum. */
  function checksumRegions(s) {
    var fc = Number(s);
    var pid = fc % 4294967296;
    var chk = Math.floor(fc / 4294967296);
    return REGIONS.filter(function (r) { return chkFor(pid, r[0]) === chk; }).map(function (r) { return r[1]; });
  }

  /* ---------- number helpers ---------- */
  function isPrime(x) {
    if (x < 2) return false;
    var small = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    for (var i = 0; i < small.length; i++) {
      if (x === small[i]) return true;
      if (x % small[i] === 0) return false;
    }
    var n = BigInt(x), d = n - 1n, r = 0;
    while ((d & 1n) === 0n) { d >>= 1n; r++; }
    function pow(b, e, m) {
      var res = 1n; b %= m;
      while (e > 0n) { if (e & 1n) res = (res * b) % m; b = (b * b) % m; e >>= 1n; }
      return res;
    }
    var bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n];
    for (var bi = 0; bi < bases.length; bi++) {
      var y = pow(bases[bi], d, n);
      if (y === 1n || y === n - 1n) continue;
      var comp = true;
      for (var j = 1; j < r; j++) {
        y = (y * y) % n;
        if (y === n - 1n) { comp = false; break; }
      }
      if (comp) return false;
    }
    return true;
  }

  function context(s, x) {
    var d = [], i;
    for (i = 0; i < 12; i++) d.push(s.charCodeAt(i) - 48);
    var num = Number(s);
    var run = 1, best = 1;
    for (i = 1; i < 12; i++) { run = d[i] === d[i - 1] ? run + 1 : 1; if (run > best) best = run; }
    var up = 1, down = 1, seq = 1;
    for (i = 1; i < 12; i++) {
      up = d[i] === d[i - 1] + 1 ? up + 1 : 1;
      down = d[i] === d[i - 1] - 1 ? down + 1 : 1;
      if (up > seq) seq = up;
      if (down > seq) seq = down;
    }
    var pal = 1;
    for (var c = 0; c < 12; c++) {
      var l = c, r = c;
      while (l >= 0 && r < 12 && d[l] === d[r]) { if (r - l + 1 > pal) pal = r - l + 1; l--; r++; }
      l = c; r = c + 1;
      while (l >= 0 && r < 12 && d[l] === d[r]) { if (r - l + 1 > pal) pal = r - l + 1; l--; r++; }
    }
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sum = 0;
    for (i = 0; i < 12; i++) { counts[d[i]]++; sum += d[i]; }
    var distinct = counts.filter(function (x) { return x > 0; }).length;
    var maxCount = Math.max.apply(null, counts);
    var period = 0;
    [1, 2, 3, 4, 6].forEach(function (p) {
      if (period) return;
      var ok = true;
      for (var k = p; k < 12; k++) if (d[k] !== d[k - p]) { ok = false; break; }
      if (ok) period = p;
    });
    var b = [s.slice(0, 4), s.slice(4, 8), s.slice(8, 12)];
    function rev(x) { return x.split('').reverse().join(''); }
    var blockPal = b.filter(function (x) { return x === rev(x); }).length;
    var twin = b[0] === b[1] || b[1] === b[2] || b[0] === b[2];
    var mirror = b[0] === rev(b[2]);
    var sortedUp = true, sortedDown = true;
    for (i = 1; i < 12; i++) { if (d[i] < d[i - 1]) sortedUp = false; if (d[i] > d[i - 1]) sortedDown = false; }
    var tz = 0; while (tz < 12 && s[11 - tz] === '0') tz++;
    var lz = 0; while (lz < 12 && s[lz] === '0') lz++;
    var sq = Math.round(Math.sqrt(num)), cu = Math.round(Math.cbrt(num));
    return {
      s: s, d: d, num: num, run: best, seq: seq, pal: pal, distinct: distinct, maxCount: maxCount,
      sum: sum, period: period, blockPal: blockPal, twin: twin, mirror: mirror,
      sortedUp: sortedUp, sortedDown: sortedDown, tz: tz, lz: lz,
      isSquare: sq * sq === num && num > 0, isCube: cu * cu * cu === num && num > 0,
      allEven: d.every(function (x) { return x % 2 === 0; }),
      allOdd: d.every(function (x) { return x % 2 === 1; }),
      allLow: d.every(function (x) { return x <= 4; }),
      allHigh: d.every(function (x) { return x >= 5; }),
      prime: null,
      rk: x && x.r > 0 ? x.r : 0, vr: x && x.v > 0 ? x.v : 0, mii: !!(x && x.mii), racer: !!x
    };
  }
  function primeOf(c) { if (c.prime === null) c.prime = isPrime(c.num); return c.prime; }
  function has(c, t) { return c.s.indexOf(t) !== -1; }

  /* ---------- badge catalog ----------
     family: badges in one family are alternatives; only the highest lvl that matched scores.
     lvl: order of strictness inside a family. */
  var B = [];
  function add(id, name, family, lvl, desc, test) { B.push({ id: id, name: name, family: family, lvl: lvl, desc: desc, test: test }); }

  [[3, 'Triple', 'same digit 3 times in a row'], [4, 'Quad', 'same digit 4 times in a row'], [5, 'Quint', 'same digit 5 times in a row'],
   [6, 'Sextet', 'same digit 6 times in a row'], [8, 'Octet', 'same digit 8 times in a row']]
    .forEach(function (x, i) { add('run' + x[0], x[1], 'run', i + 1, x[2], function (c) { return c.run >= x[0]; }); });

  [[4, 'Stairs', 'a 4-digit run counting up or down by 1'], [5, 'Long Stairs', 'a 5-digit run counting up or down by 1'],
   [6, 'Escalator', 'a 6-digit run counting up or down by 1'], [8, 'Grand Staircase', 'an 8-digit run counting up or down by 1'],
   [10, 'Full Ladder', 'a 10-digit run counting up or down by 1']]
    .forEach(function (x, i) { add('seq' + x[0], x[1], 'seq', i + 1, x[2], function (c) { return c.seq >= x[0]; }); });

  [[5, 'Mini Echo', 'a 5-digit palindrome hidden inside'], [6, 'Echo', 'a 6-digit palindrome hidden inside'],
   [8, 'Deep Echo', 'an 8-digit palindrome hidden inside'], [10, 'Mirror Hall', 'a 10-digit palindrome hidden inside'],
   [12, 'Palindrome', 'the whole code reads the same backwards']]
    .forEach(function (x, i) { add('pal' + x[0], x[1], 'pal', i + 1, x[2], function (c) { return c.pal >= x[0]; }); });

  add('div9', 'Nine Colors', 'div', 1, 'at least 9 different digits', function (c) { return c.distinct >= 9; });
  add('div10', 'Pandigital', 'div', 2, 'every digit 0-9 appears', function (c) { return c.distinct >= 10; });
  [[5, 'Quintet', 'only 5 different digits'], [4, 'Quartet', 'only 4 different digits'], [3, 'Trio', 'only 3 different digits'], [2, 'Duo', 'only 2 different digits']]
    .forEach(function (x, i) { add('sparse' + x[0], x[1], 'sparse', i + 1, x[2], function (c) { return c.distinct <= x[0]; }); });

  add('loop6', 'Twin Halves', 'loop', 1, 'the first 6 digits repeat', function (c) { return c.period === 6 || c.period === 3 || c.period === 2 || c.period === 1; });
  add('loop4', 'Three-Peat', 'loop', 2, 'one 4-digit block repeated 3 times', function (c) { return c.period === 4 || c.period === 2 || c.period === 1; });
  add('loop3', 'Four-Peat', 'loop', 3, 'a 3-digit pattern repeated 4 times', function (c) { return c.period === 3 || c.period === 1; });
  add('loop2', 'Alternator', 'loop', 4, 'two digits alternating all the way', function (c) { return c.period === 2 || c.period === 1; });

  add('bpal1', 'Block Echo', 'bpal', 1, 'one 4-digit block is a palindrome', function (c) { return c.blockPal >= 1; });
  add('bpal2', 'Double Echo', 'bpal', 2, 'two 4-digit blocks are palindromes', function (c) { return c.blockPal >= 2; });
  add('bpal3', 'Triple Echo', 'bpal', 3, 'all three blocks are palindromes', function (c) { return c.blockPal >= 3; });
  add('btwin', 'Twin Blocks', 'bmatch', 1, 'two blocks are identical', function (c) { return c.twin; });
  add('bmirror', 'Block Mirror', 'bmatch', 2, 'last block is the first block reversed', function (c) { return c.mirror; });

  add('nice', 'Nice', 'nice', 1, 'contains 69', function (c) { return has(c, '69'); });
  add('nicenice', 'Nice Nice', 'nice', 2, 'contains 6969', function (c) { return has(c, '6969'); });
  add('sixseven', 'Six Seven', 'sixseven', 1, 'contains 67', function (c) { return has(c, '67'); });
  add('sixseven2', 'Six Seven, Six Seven', 'sixseven', 2, 'contains 6767', function (c) { return has(c, '6767'); });
  add('blaze', 'Roll Up', 'blaze', 1, 'contains 420', function (c) { return has(c, '420'); });
  add('blaze2', 'Blaze It Nice', 'blaze', 2, 'contains 42069', function (c) { return has(c, '42069'); });
  add('blaze3', 'Blazin\' Six Seven', 'blaze', 2, 'contains 42067', function (c) { return has(c, '42067'); });
  add('beast', 'Beast Mode', 'beast', 1, 'contains 666', function (c) { return has(c, '666'); });
  add('jackpot', 'Jackpot', 'jackpot', 1, 'contains 777', function (c) { return has(c, '777'); });
  add('leet', 'Leet', 'leet', 1, 'contains 1337', function (c) { return has(c, '1337'); });
  add('answer42', 'Answer to Everything', 'answer42', 1, 'contains 42', function (c) { return has(c, '42'); });
  add('calc', 'Calculator Joke', 'calc', 1, 'contains 8008', function (c) { return has(c, '8008'); });
  add('calc2', 'Calculator Classic', 'calc', 2, 'contains 5318008', function (c) { return has(c, '5318008'); });
  add('lucky8', 'Lucky Eights', 'lucky8', 1, 'contains 888', function (c) { return has(c, '888'); });
  add('nines', 'WRLD', 'nines', 1, 'contains 999', function (c) { return has(c, '999'); });
  add('emergency', 'Emergency', 'emergency', 1, 'contains 911', function (c) { return has(c, '911'); });
  add('elite', 'Elite Plus', 'leet', 2, 'contains 31337', function (c) { return has(c, '31337'); });
  add('jenny', 'Jenny', 'jenny', 1, 'contains 8675309', function (c) { return has(c, '8675309'); });
  add('apollo', 'Apollo', 'apollo', 1, 'contains 1969, the moon landing year', function (c) { return has(c, '1969'); });
  add('odyssey', 'Space Odyssey', 'odyssey', 1, 'contains 2001', function (c) { return has(c, '2001'); });
  add('binary', 'Binary Brain', 'binary', 1, 'only 0s and 1s', function (c) { return /^[01]+$/.test(c.s); });
  add('golden', 'Golden Ratio', 'golden', 1, 'contains 1618', function (c) { return has(c, '1618'); });
  add('golden2', 'Golden Spiral', 'golden', 2, 'contains 161803', function (c) { return has(c, '161803'); });
  add('euler', 'Euler', 'euler', 1, 'contains 2718', function (c) { return has(c, '2718'); });
  add('euler2', 'Natural Log', 'euler', 2, 'contains 27182', function (c) { return has(c, '27182'); });
  add('birthday', 'Birthday', 'birthday', 1, 'contains 321', function (c) { return has(c, '321'); });
  add('drum808', 'Bass', 'drum808', 1, 'contains 808', function (c) { return has(c, '808'); });
  add('hometown', 'Home', 'hometown', 1, 'contains 608', function (c) { return has(c, '608'); });
  /* Racer badges: they depend on who the code belongs to (leaderboard rank, VR, saved Mii), so they only apply when the racer is known.
     Their odds come from the real racer list, not from random codes (see sim.js). */
  add('rank1000', 'Top 1,000', 'rank', 1, 'the racer is in the top 1,000 on the VR leaderboard', function (c) { return c.rk > 0 && c.rk <= 1000; });
  add('rank100', 'Top 100', 'rank', 2, 'the racer is in the top 100 on the VR leaderboard', function (c) { return c.rk > 0 && c.rk <= 100; });
  add('rank10', 'Top 10', 'rank', 3, 'the racer is in the top 10 on the VR leaderboard', function (c) { return c.rk > 0 && c.rk <= 10; });
  add('rank1', 'Number One', 'rank', 4, 'the racer is #1 on the VR leaderboard', function (c) { return c.rk === 1; });
  add('vr25k', 'VR 25K', 'vr', 1, 'the racer has 25,000 VR or more', function (c) { return c.vr >= 25000; });
  add('vr50k', 'VR 50K', 'vr', 2, 'the racer has 50,000 VR or more', function (c) { return c.vr >= 50000; });
  add('vr100k', 'VR 100K', 'vr', 3, 'the racer has 100,000 VR or more', function (c) { return c.vr >= 100000; });
  add('vr10k', 'Fresh Start', 'vrexact', 1, 'the racer has exactly 10,000 VR, the starting amount', function (c) { return c.vr === 10000; });
  add('travis', 'Travis', 'travis', 1, 'contains 90210', function (c) { return has(c, '90210'); });
  add('mineagain', 'Mine Again', 'mineagain', 1, 'contains 1738', function (c) { return has(c, '1738'); });
  add('freestyle', 'Freestyle', 'freestyle', 1, 'contains 1400999', function (c) { return has(c, '1400999'); });
  add('nineten', '9+10', 'nineten', 1, 'contains 21', function (c) { return has(c, '21'); });
  add('over9000', 'Over 9000', 'over9000', 1, 'contains 9001', function (c) { return has(c, '9001'); });
  add('bond', 'Bond. James Bond.', 'bond', 1, 'contains 007', function (c) { return has(c, '007'); });
  add('cc150', '150cc', 'cc150', 1, 'contains 150, the fastest engine class', function (c) { return has(c, '150'); });
  add('wii', 'Wii Year', 'wii', 1, 'contains 2006 or 2008, the Wii and Mario Kart Wii release years', function (c) { return has(c, '2006') || has(c, '2008'); });
  add('superyear', 'Super Year', 'superyear', 1, 'contains 1985', function (c) { return has(c, '1985'); });
  add('pi1', 'Pi Day', 'pi', 1, 'contains 3141', function (c) { return has(c, '3141'); });
  add('pi2', 'Pi Slice', 'pi', 2, 'contains 31415', function (c) { return has(c, '31415'); });
  add('pi3', 'Pi Pie', 'pi', 3, 'contains 314159', function (c) { return has(c, '314159'); });
  add('fib1', 'Fibonacci Start', 'fib', 1, 'contains 11235', function (c) { return has(c, '11235'); });
  add('fib2', 'Fibonacci Run', 'fib', 2, 'contains 112358', function (c) { return has(c, '112358'); });

  [[5, 'Heavy Digit', 'one digit shows up 5 times'], [6, 'Digit Hoard', 'one digit shows up 6 times'], [7, 'Digit Flood', 'one digit shows up 7 times'], [8, 'Digit Monopoly', 'one digit shows up 8 times']]
    .forEach(function (x, i) { add('heavy' + x[0], x[1], 'heavy', i + 1, x[2], function (c) { return c.maxCount >= x[0]; }); });

  add('sumlow', 'Featherweight', 'sumlow', 1, 'digits add up to 30 or less', function (c) { return c.sum <= 30; });
  add('sumhigh', 'Heavyweight', 'sumhigh', 1, 'digits add up to 78 or more', function (c) { return c.sum >= 78; });

  add('even', 'Even Steven', 'parity', 1, 'the code is an even number', function (c) { return c.num % 2 === 0; });
  add('odd', 'Odd One Out', 'parity', 1, 'the code is an odd number', function (c) { return c.num % 2 === 1; });
  add('div3', 'Divisible by 3', 'div3', 1, 'the code divides evenly by 3', function (c) { return c.num % 3 === 0; });
  add('div7', 'Divisible by 7', 'div7', 1, 'the code divides evenly by 7', function (c) { return c.num % 7 === 0; });
  add('div11', 'Divisible by 11', 'div11', 1, 'the code divides evenly by 11', function (c) { return c.num % 11 === 0; });

  [[3, 'Round', 'ends in 3 zeros'], [4, 'Rounder', 'ends in 4 zeros'], [5, 'Rounder Still', 'ends in 5 zeros'], [6, 'Million', 'ends in 6 zeros'], [9, 'Billion', 'ends in 9 zeros']]
    .forEach(function (x, i) { add('tz' + x[0], x[1], 'round', i + 1, x[2], function (c) { return c.tz >= x[0]; }); });
  [[2, 'Zero Pad', 'starts with 2 zeros'], [3, 'Low Roller', 'starts with 3 zeros'], [4, 'Deep Zero', 'starts with 4 zeros'], [5, 'Almost Nothing', 'starts with 5 zeros']]
    .forEach(function (x, i) { add('lz' + x[0], x[1], 'lead0', i + 1, x[2], function (c) { return c.lz >= x[0]; }); });

  add('prime', 'Prime Time', 'prime', 1, 'the code is a prime number', function (c) { return primeOf(c); });
  add('square', 'Perfect Square', 'square', 1, 'the code is a perfect square', function (c) { return c.isSquare; });

  add('sortup', 'Ascending Order', 'order', 1, 'digits never go down', function (c) { return c.sortedUp; });
  add('sortdown', 'Descending Order', 'order', 1, 'digits never go up', function (c) { return c.sortedDown; });
  add('cube', 'Perfect Cube', 'cube', 1, 'the code is a perfect cube', function (c) { return c.isCube; });
  add('alleven', 'All Even Digits', 'digitparity', 1, 'every digit is even', function (c) { return c.allEven; });
  add('allodd', 'All Odd Digits', 'digitparity', 1, 'every digit is odd', function (c) { return c.allOdd; });
  add('alllow', 'Low Digits', 'digitrange', 1, 'every digit is 4 or lower', function (c) { return c.allLow; });

  /* Creator codes: two specific friend codes carry their own top-tier badge. */
  add('creator1', 'Creator Code', 'creator', 1, 'one of the creator\u2019s own friend codes', function (cx) { return cx.s === '000099099010'; });
  add('creator2', 'Creator Code II', 'creator', 1, 'one of the creator\u2019s own friend codes', function (cx) { return cx.s === '382252251822'; });
  B[B.length - 2].special = true; B[B.length - 1].special = true;

  /* ---------- tiers & EP ---------- */
  var BADGE_TIERS = [
    { id: 'common', name: 'Common', min: 0.10, ep: 2 },
    { id: 'uncommon', name: 'Uncommon', min: 0.01, ep: 8 },
    { id: 'rare', name: 'Rare', min: 0.001, ep: 25 },
    { id: 'epic', name: 'Epic', min: 0.0001, ep: 80 },
    { id: 'anomaly', name: 'Anomaly', min: 0.00001, ep: 250 },
    { id: 'mythic', name: 'Mythic', min: 0, ep: 800 }
  ];
  /* EP follows RNGdle: a badge is worth 100 / (its odds), so a 1-in-11 badge is 1,100 EP.
     Odds are floored at 1 in a million, which caps one badge at 100,000,000 EP. */
  var P_FLOOR = 1e-6;
  function epFor(p) { return Math.round(100 / Math.max(p, P_FLOOR)); }
  var SPECIAL_TIER = { id: 'creator', name: 'Creator', min: 0, ep: 1000000000 };
  function badgeTier(p) {
    for (var i = 0; i < BADGE_TIERS.length; i++) if (p >= BADGE_TIERS[i].min || i === BADGE_TIERS.length - 1) return BADGE_TIERS[i];
  }

  /* Every badge whose condition the code meets (before family settling). */
  function matchAll(s, x) {
    var c = context(s, x);
    return B.filter(function (b) { return b.test(c); });
  }

  /* probs: {id: probability}. Returns kept/shadowed badges and the EP total. */
  function score(s, probs, x) {
    var matched = matchAll(s, x);
    var byFam = {};
    matched.forEach(function (b) { if (!byFam[b.family] || b.lvl > byFam[b.family].lvl) byFam[b.family] = b; });
    var kept = [], shadowed = [];
    matched.forEach(function (b) {
      var p = probs[b.id] || 0, t = b.special ? SPECIAL_TIER : badgeTier(p);
      var row = { id: b.id, name: b.name, family: b.family, desc: b.desc, p: p, tier: t.id, tierName: t.name, ep: b.special ? t.ep : epFor(p), by: byFam[b.family].name, special: !!b.special };
      (byFam[b.family] === b ? kept : shadowed).push(row);
    });
    kept.sort(function (a, b) { return b.ep - a.ep || a.p - b.p; });
    var total = kept.reduce(function (a, b) { return a + b.ep; }, 0);
    return { total: total, kept: kept, shadowed: shadowed };
  }

  /* cdf: {eps:[], below:[], equal:[]} from the simulation.
     Returns {mid, below}: midrank percentile and the share of codes scoring strictly lower. */
  function rank(ep, cdf) {
    var eps = cdf.eps, n = eps.length, lo = 0, hi = n - 1, idx = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (eps[m] <= ep) { idx = m; lo = m + 1; } else hi = m - 1; }
    if (idx < 0) return { mid: 0, below: 0 };
    if (eps[idx] === ep) return { mid: cdf.below[idx] + cdf.equal[idx] / 2, below: cdf.below[idx] };
    var cum = cdf.below[idx] + cdf.equal[idx];
    if (idx + 1 < n) cum += (cdf.below[idx + 1] - cum) * (ep - eps[idx]) / (eps[idx + 1] - eps[idx]);
    return { mid: cum, below: cum };
  }
  var NUMBER_TIERS = [
    { id: 'mythic', name: 'Mythic', min: 0.99 }, { id: 'anomaly', name: 'Anomaly', min: 0.95 },
    { id: 'epic', name: 'Epic', min: 0.90 }, { id: 'rare', name: 'Rare', min: 0.75 },
    { id: 'uncommon', name: 'Uncommon', min: 0.50 }, { id: 'common', name: 'Common', min: 0 },
    { id: 'trash', name: 'Trash', min: -1 }
  ];
  /* Trash: the bottom 1% of codes. */
  function numberTier(r) {
    if (r.mid < 0.01) return NUMBER_TIERS[NUMBER_TIERS.length - 1];
    for (var i = 0; i < NUMBER_TIERS.length; i++) if (r.mid >= NUMBER_TIERS[i].min) return NUMBER_TIERS[i];
  }

  /* ---------- input parsing ---------- */
  function parse(raw) {
    var digits = String(raw).replace(/[\s-]/g, '');
    if (/[^0-9]/.test(digits)) return { ok: false, error: 'Use digits only. Spaces and dashes are fine.' };
    if (digits.length < 12) return { ok: false, error: 'Needs 12 digits, you have ' + digits.length + '.', partial: true };
    if (digits.length > 12) return { ok: false, error: 'A friend code is 12 digits, you have ' + digits.length + '.' };
    return { ok: true, s: digits, pretty: digits.slice(0, 4) + '-' + digits.slice(4, 8) + '-' + digits.slice(8) };
  }

  var api = {
    REGIONS: REGIONS, RACER_DEN: 4, chkFor: chkFor,
    BADGES: B, BADGE_TIERS: BADGE_TIERS, SPECIAL_TIER: SPECIAL_TIER, epFor: epFor, P_FLOOR: P_FLOOR, NUMBER_TIERS: NUMBER_TIERS, md5: md5, checksumRegions: checksumRegions, build: build,
    matchAll: matchAll, score: score, rank: rank, numberTier: numberTier, badgeTier: badgeTier, parse: parse, isPrime: isPrime
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FC = api;
})(typeof window !== 'undefined' ? window : globalThis);
