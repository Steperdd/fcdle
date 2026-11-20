const fs=require('fs'),FC=require('../core.js'),P=require('../probs.json');const MII=new Set(JSON.parse(fs.readFileSync(__dirname+'/../pool.json')).m||[]);
const kept={};FC.BADGES.forEach(b=>kept[b.id]=0);
for(const f of fs.readdirSync(__dirname+'/../fc').filter(x=>/^\d+\.json$/.test(x)))
  for(const r of JSON.parse(fs.readFileSync(__dirname+'/../fc/'+f))) FC.score(r[1],P.probs,{r:r[0],v:r[3],mii:MII.has(r[1])}).kept.forEach(b=>kept[b.id]++);
const cnt=JSON.parse(fs.readFileSync(require('os').tmpdir()+'/fcdle-audit.json')).cnt;
console.log('matched but NEVER scored (always shadowed):');
FC.BADGES.filter(b=>cnt[b.id]>0&&kept[b.id]===0).forEach(b=>console.log(' ',b.id,b.name,cnt[b.id]));
