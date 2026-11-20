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

// Monte Carlo over structurally valid friend codes (32-bit profile ID + 7-bit checksum)
const N = 4000000;
let seed=20260101; const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};
const counts = {}; FC.BADGES.forEach(b=>counts[b.id]=0);
const matches = [];
let SOLO = [];
const RACER = {}; ['rank1000','rank100','rank10','rank1','vr25k','vr50k','vr100k','vr10k'].forEach(id => { RACER[id] = 1; });
for (let i=0;i<N;i++){
  const pid = Math.floor(rnd()*4294967296), chk = Math.floor(rnd()*128);
  const s = String(chk*4294967296+pid).padStart(12,'0');
  const m = FC.matchAll(s);
  m.forEach(b=>counts[b.id]++);
  matches.push(m.map(b=>b.id));
}
const probs={}; for (const id in counts) probs[id]=counts[id]/N;
// EP per sample with settled families
const byId={}; FC.BADGES.forEach(b=>byId[b.id]=b);
const hist=new Map();
for (const ids of matches){
  const best={};
  ids.forEach(id=>{const b=byId[id]; if(!best[b.family]||b.lvl>byId[best[b.family]].lvl) best[b.family]=id;});
  let ep=0; for(const f in best) ep+=FC.epFor(probs[best[f]]);
  hist.set(ep,(hist.get(ep)||0)+1);
}
const all=[...hist.keys()].sort((a,b)=>a-b);
// thin the table: keep big buckets and a point roughly every 0.05% of mass; merged mass is interpolated
let cum=0, acc=0; const eps=[],below=[],equal=[];
all.forEach((e,i)=>{
  const m=hist.get(e)/N; acc+=m;
  if (m>=3e-4 || acc>=5e-4 || i===all.length-1) { eps.push(e); below.push(cum); equal.push(m); acc=0; }
  cum+=m;
});
// Racer badges: odds are the share of real racers that qualify (random codes carry no racer info)
{
  const fs = require('fs'), pool = JSON.parse(fs.readFileSync('pool.json')), mii = new Set(pool.m || []);
  const rc = {}, kc = {}; let n = 0;
  FC.BADGES.forEach(b => { rc[b.id] = 0; kc[b.id] = 0; });
  for (const f of fs.readdirSync('fc').filter(x => /^\d+\.json$/.test(x))) {
    for (const r of JSON.parse(fs.readFileSync('fc/' + f))) {
      n++;
      FC.matchAll(r[1], { r: r[0], v: r[3], mii: mii.has(r[1]) }).forEach(b => { if (RACER[b.id]) rc[b.id]++; });
      FC.score(r[1], probs, { r: r[0], v: r[3], mii: mii.has(r[1]) }).kept.forEach(b => { kc[b.id]++; });
    }
  }
  for (const id in RACER) { counts[id] = rc[id]; probs[id] = rc[id] / n; }
  SOLO = FC.BADGES.filter(b => !b.special && kc[b.id] === 1).map(b => b.id);   // only one racer in the list can score these
  console.log('one-of-a-kind badges:', SOLO.join(' '));
  console.log('racer badge odds from', n, 'racers:', Object.keys(RACER).map(id => id + '=' + rc[id]).join(' '));
}
require('fs').writeFileSync('probs.json', JSON.stringify({N, counts, probs, solo: SOLO, cdf:{eps,below,equal}}));
console.log('distinct EP values', eps.length, 'min', eps[0], 'max', eps[eps.length-1]);
const q=p=>eps.find((e,i)=>below[i]+equal[i]>=p);
console.log('EP quantiles 1/10/50/75/90/95/99/99.9:', [.01,.1,.5,.75,.9,.95,.99,.999].map(q).join(' '));
console.log('lowest bucket mass', equal[0], 'at EP', eps[0]);
const tbl = FC.BADGES.map(b=>[b.id, b.family, (probs[b.id]*100).toPrecision(3)+'%', counts[b.id], FC.badgeTier(probs[b.id]).name]);
console.log(tbl.map(r=>r.join('\t')).join('\n'));
