const fs=require('fs'),FC=require('../core.js'),P=require('../probs.json');const MII=new Set(JSON.parse(fs.readFileSync(__dirname+'/../pool.json')).m||[]);
const cnt={},ex={};let n=0;
FC.BADGES.forEach(b=>{cnt[b.id]=0});
for(const f of fs.readdirSync(__dirname+'/../fc').filter(x=>/^\d+\.json$/.test(x))){
  for(const r of JSON.parse(fs.readFileSync(__dirname+'/../fc/'+f))){
    n++; const s=r[1];
    FC.matchAll(s,{r:r[0],v:r[3],mii:MII.has(s)}).forEach(b=>{cnt[b.id]++; if(!ex[b.id]) ex[b.id]=s});
  }
}
console.log('pool players:',n,'badges:',FC.BADGES.length);
const zero=FC.BADGES.filter(b=>cnt[b.id]===0);
console.log('\nNOT FOUND in any real racer ('+zero.length+'):');
zero.forEach(b=>console.log(' ',b.id.padEnd(12),b.name.padEnd(24),b.desc,'| sim p='+P.probs[b.id]));
console.log('\nrarest found (<=5 racers):');
FC.BADGES.filter(b=>cnt[b.id]>0&&cnt[b.id]<=5).forEach(b=>console.log(' ',b.name.padEnd(24),cnt[b.id],ex[b.id]));
// effective chance per roll
fs.writeFileSync(require('os').tmpdir()+'/fcdle-audit.json',JSON.stringify({cnt,n}));
