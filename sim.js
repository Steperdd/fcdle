const FC = require('./core.js');
const crypto = require('crypto');
const assert = require('assert');

// md5 vs node crypto
for (let i=0;i<50;i++){ const b=crypto.randomBytes(1+Math.floor(Math.random()*130)); 
  assert.strictEqual(Buffer.from(FC.md5(b)).toString('hex'), crypto.createHash('md5').update(b).digest('hex')); }
// checksum sample
console.log('checksum 025904297091 ->', FC.checksumRegions('025904297091'));
// prime sanity
assert(FC.isPrime(999999999989) && !FC.isPrime(999999999999) && FC.isPrime(2147483647) && !FC.isPrime(561));
// badge spot checks
const has=(s,id)=>FC.matchAll(s).some(b=>b.id===id);
assert(has('123456654321','pal12') && has('123456654321','bmirror'));
assert(has('111111111111','run8') && has('111111111111','loop3'));
assert(has('123412341234','loop4') && has('123412341234','btwin'));
assert(has('012345678901','seq8') && has('012345678901','div10'));
assert(has('000001000000','square'));
assert(has('123456789012','div10') && has('123456789012','seq9')===false);
assert(has('200801506969','wii') && has('200801506969','cc150') && has('200801506969','nicenice'));
assert(has('000000123456','lz5')===true && has('000000123456','lz4'));
assert(has('000012345678','lz4') && has('123000000000','tz6') && has('123000000000','tz3'));
assert(has('000000000001','lz5')===true && has('000000000001','lz4'));
assert(has('112233445566','sortup'));
assert(has('246802468024','alleven'));

assert(FC.parse('1234 5678-9012').ok && !FC.parse('12345').ok && !FC.parse('12345678901a').ok);
console.log('unit checks passed');

// ---- Odds for the daily roll ----
// A roll is a random legal friend code (RACER_DEN-1 days out of RACER_DEN on average) or, 1 in RACER_DEN, a real racer from the list.
const fs = require('fs');
const RACER_SHARE = 1 / FC.RACER_DEN, RANDOM_SHARE = 1 - RACER_SHARE;
const N = 4000000;
let seed=20260101; const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};
const byId={}; FC.BADGES.forEach(b=>byId[b.id]=b);
const RACER = {}; ['rank1000','rank100','rank10','rank1','vr25k','vr50k','vr100k','vr10k'].forEach(id => { RACER[id] = 1; });

// 1) random legal codes (profile ID plus a 7-bit checksum, which is pseudo-random)
const counts = {}; FC.BADGES.forEach(b=>counts[b.id]=0);
const matches = [];
for (let i=0;i<N;i++){
  const pid = Math.floor(rnd()*4294967296), chk = Math.floor(rnd()*128);
  const s = String(chk*4294967296+pid).padStart(12,'0');
  const m = FC.matchAll(s);
  m.forEach(b=>counts[b.id]++);
  matches.push(m.map(b=>b.id));
}
// 2) real racers
const pool = JSON.parse(fs.readFileSync('pool.json')), mii = new Set(pool.m || []);
const rows = [];
for (const f of fs.readdirSync('fc').filter(x => /^\d+\.json$/.test(x))) for (const r of JSON.parse(fs.readFileSync('fc/' + f))) rows.push(r);
const nPool = rows.length;
const rctx = r => ({ r: r[0], v: r[3], mii: mii.has(r[1]) });
const rmatch = rows.map(r => FC.matchAll(r[1], rctx(r)).map(b => b.id));
const rc = {}; FC.BADGES.forEach(b => rc[b.id] = 0);
rmatch.forEach(ids => ids.forEach(id => rc[id]++));
// 3) mixed odds: what share of daily rolls match each badge
// 2b) exact odds for the very rare badges. A random legal code is (essentially) uniform over 0 .. 128*2^32-1,
// so for badges whose matches we can list, count them exactly instead of hoping the Monte Carlo hits them.
const NMAX = 128 * 4294967296;
const randP = {}; FC.BADGES.forEach(b => { randP[b.id] = counts[b.id] / N; });
{
  const EXACT = ['loop2','seq10','cube','sortdown','loop6','loop4','loop3','bpal3','binary','sortup','square','jenny','freestyle','seq8','tz6','tz9'];
  const cand = new Set(), p12 = x => String(x).padStart(12, '0');
  const add = x => { if (x >= 0 && x < NMAX) cand.add(x); };
  for (let a = 0; a < 1e6; a++) { const h = String(a).padStart(6, '0'); add(Number(h + h)); }                  // period 6 (and 3, 2, 1)
  for (let a = 0; a < 1e4; a++) { const h = String(a).padStart(4, '0'); add(Number(h + h + h)); }               // period 4
  for (let a = 0; a < 1e3; a++) { const h = String(a).padStart(3, '0'); add(Number(h + h + h + h)); }           // period 3
  const pal = []; for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) pal.push('' + a + b + b + a);       // three palindromic blocks
  for (const x of pal) for (const y of pal) for (const z of pal) add(Number(x + y + z));
  for (let m = 0; m < 4096; m++) add(Number(m.toString(2).padStart(12, '0')));                                  // only 0s and 1s
  (function up(prefix, last) { if (prefix.length === 12) { add(Number(prefix)); return; } for (let d = last; d < 10; d++) up(prefix + d, d); })('', 0);   // digits never go down
  for (let k = 0; k * k < NMAX; k++) add(k * k);                                                                // perfect squares
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) add(Number((''+a+b).repeat(6)));                      // two digits alternating
  for (let k = 0; k * k * k < NMAX; k++) add(k * k * k);                                                        // perfect cubes
  (function dn(prefix, last) { if (prefix.length === 12) { add(Number(prefix)); return; } for (let d = last; d >= 0; d--) dn(prefix + d, d); })('', 9);   // digits never go up
  for (let pos = 0; pos <= 2; pos++) for (const run of ['0123456789', '9876543210']) for (let k = 0; k < 100; k++) { const f = String(k).padStart(2, '0'); add(Number(f.slice(0, pos) + run + f.slice(pos))); }   // 10-digit run
  for (const t of ['8675309', '1400999']) { const free = 12 - t.length, F = Math.pow(10, free);                  // contains a 7-digit string
    for (let pos = 0; pos <= free; pos++) for (let k = 0; k < F; k++) { const f = String(k).padStart(free, '0'); add(Number(f.slice(0, pos) + t + f.slice(pos))); } }
  for (let pos = 0; pos <= 4; pos++) for (let st = 0; st < 10; st++) for (const dir of [1, -1]) {                // a run of 8 consecutive digits
    let run = '', ok = true; for (let i = 0; i < 8; i++) { const d = st + dir * i; if (d < 0 || d > 9) { ok = false; break; } run += d; }
    if (!ok) continue; for (let k = 0; k < 1e4; k++) { const f = String(k).padStart(4, '0'); add(Number(f.slice(0, pos) + run + f.slice(pos))); } }
  for (let k = 0; k * 1e6 < NMAX; k++) add(k * 1e6);                                                            // 6+ trailing zeros
  const ex = {}; EXACT.forEach(id => { ex[id] = 0; });
  // a roll is a random profile ID in a random region, so a code is rolled with probability (regions where it is legal) / (4 * 2^32)
  const DEN = 4 * 4294967296;
  cand.forEach(x => {
    const s = p12(x), hit = FC.matchAll(s).filter(b => b.id in ex);
    if (!hit.length) return;
    const w = FC.checksumRegions(s).length;
    if (w) hit.forEach(b => { ex[b.id] += w; });
  });
  EXACT.forEach(id => { randP[id] = ex[id] / DEN; });
  console.log('exact random odds (1 in):', EXACT.map(id => id + ' ' + (ex[id] ? Math.round(DEN / ex[id]) : 'none')).join(', '));
}
const probs = {};
FC.BADGES.forEach(b => { probs[b.id] = RANDOM_SHARE * randP[b.id] + RACER_SHARE * rc[b.id] / nPool; });
// 4) EP distribution of a daily roll, then a thinned CDF
const hist = new Map(), add = (ep, w) => hist.set(ep, (hist.get(ep) || 0) + w);
const epOf = ids => {
  const best = {};
  ids.forEach(id => { const b = byId[id]; if (!best[b.family] || b.lvl > byId[best[b.family]].lvl) best[b.family] = id; });
  let ep = 0; for (const f in best) ep += FC.epFor(probs[best[f]]); return ep;
};
matches.forEach(ids => add(epOf(ids), RANDOM_SHARE / N));
rmatch.forEach(ids => add(epOf(ids), RACER_SHARE / nPool));
const all=[...hist.keys()].sort((a,b)=>a-b);
// thin the table: keep big buckets and a point roughly every 0.05% of mass; merged mass is interpolated
let cum=0, acc=0; const eps=[],below=[],equal=[];
all.forEach((e,i)=>{
  const m=hist.get(e); acc+=m;
  if (m>=3e-4 || acc>=5e-4 || i===all.length-1) { eps.push(e); below.push(cum); equal.push(m); acc=0; }
  cum+=m;
});
// 5) "one of a kind": badges that exactly one code can earn. Racer badges earned by a single racer qualify.
const kc = {}; FC.BADGES.forEach(b => kc[b.id] = 0);
rows.forEach(r => FC.score(r[1], probs, rctx(r)).kept.forEach(b => { kc[b.id]++; }));
const SOLO = FC.BADGES.filter(b => !b.special && RACER[b.id] && kc[b.id] === 1).map(b => b.id);
for (const id in counts) counts[id] = Math.round(probs[id] * N);
console.log('one-of-a-kind badges:', SOLO.join(' '));
fs.writeFileSync('probs.json', JSON.stringify({N, counts, probs, solo: SOLO, cdf:{eps,below,equal}}));
console.log('distinct EP values', eps.length, 'min', eps[0], 'max', eps[eps.length-1]);
const q=p=>eps.find((e,i)=>below[i]+equal[i]>=p);
console.log('EP quantiles 1/10/50/75/90/95/99/99.9:', [.01,.1,.5,.75,.9,.95,.99,.999].map(q).join(' '));
const tbl = FC.BADGES.map(b=>[b.id, b.family, (probs[b.id]*100).toPrecision(3)+'%', counts[b.id], FC.badgeTier(probs[b.id]).name]);
console.log(tbl.map(r=>r.join('\t')).join('\n'));
