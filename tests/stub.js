
(() => {
  const store = {}; const subs = [];
  const mkDoc = (path) => ({
    id: path.split('/').pop(), path,
    async get(){ const d = store[path]; return {id:this.id, exists: !!d, data: () => d ? JSON.parse(JSON.stringify(d)) : undefined}; },
    async set(v){ store[path] = JSON.parse(JSON.stringify(v)); subs.forEach(f=>f()); },
    async update(v){ if(!store[path]) throw {code:'invalid_argument'}; const m=(a,b)=>{for(const k in b){ if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=a[k]||{};m(a[k],b[k]);} else a[k]=b[k]; }}; m(store[path],JSON.parse(JSON.stringify(v))); subs.forEach(f=>f()); },
  });
  const db = {
    doc: mkDoc,
    collection(p){ return { doc:(id)=>mkDoc(p+'/'+id), onSnapshot(next){ const f=()=>{ const docs=Object.keys(store).filter(k=>k.startsWith(p+'/')).map(k=>({id:k.split('/').pop(), exists:true, data:()=>JSON.parse(JSON.stringify(store[k]))})); next({docs}); }; subs.push(f); setTimeout(f,10); return ()=>{}; } }; }
  };
  const user = { async id(){ return 'user-abc123'; }, async profiles(ids){ const o={}; ids.forEach(i=>o[i]={name:'Test Racer'}); return o; } };
  window.claude = { use: async (n) => n==='db'?db : n==='user'?user : null };
  window.__store = store;
})();
