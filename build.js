const fs = require('fs');
const sim = JSON.parse(fs.readFileSync('probs.json', 'utf8'));
const r = (x, d) => Number(x.toFixed(d));
const probs = {};
for (const k in sim.probs) probs[k] = Number(sim.probs[k].toPrecision(4));
const data = {
  N: sim.N,
  probs,
  solo: sim.solo || [],
  cdf: { eps: sim.cdf.eps, below: sim.cdf.below.map(x => r(x, 7)), equal: sim.cdf.equal.map(x => r(x, 7)) }
};
let t = fs.readFileSync('template.html', 'utf8');
t = t.replace('/*__CORE__*/', () => fs.readFileSync('core.js', 'utf8'));
t = t.replace('/*__DATA__*/', () => JSON.stringify(data));
t = t.replace('/*__POOL__*/', () => fs.readFileSync('pool.json', 'utf8'));
fs.writeFileSync('index.html', t);
console.log('index.html', (t.length / 1024).toFixed(1) + ' KiB');
