import json, sys, os, collections
# usage: python3 build_pool.py players.json   (the saved leaderboard export; see README)
src = sys.argv[1]
d = json.load(open(src))
rows = d['rows']; susp = d.get('susp', [])
seen = {}
for r in rows:
    fc = r[1].replace('-', '')
    if len(fc) != 12 or not fc.isdigit(): continue
    seen.setdefault(fc, r)          # dedupe by friend code, keep best rank
# extra entry supplied by the creator (not on the scraped list)
if '382252251822' not in seen:
    rank = 1 + sum(1 for r in rows if r[3] > 51458)
    seen['382252251822'] = [rank, '3822-5225-1822', 'FreeSteprd', 51458]
NAME_OVERRIDES = {'000099099010': 'Steperd', '382252251822': 'Steperd'}
for fc, nm in NAME_OVERRIDES.items():
    if fc in seen: seen[fc] = [seen[fc][0], seen[fc][1], nm, seen[fc][3]]
uniq = sorted(seen.items())
print('rows', len(rows), 'unique fc', len(uniq), 'suspicious excluded', len(susp), 'reported total', d.get('totalCount'))
shards = collections.OrderedDict()
for fc, r in uniq:
    shards.setdefault(fc[:2], []).append([r[0], fc, r[2], r[3]])
os.makedirs('fc', exist_ok=True)
for f in os.listdir('fc'): os.remove(os.path.join('fc', f))
for p, lst in shards.items():
    json.dump(lst, open(f'fc/{p}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
ps = list(shards.keys())
# friend codes that have a Mii picture in miis_fc/
miis = sorted(f[:-5] for f in os.listdir('miis_fc') if f.endswith('.webp')) if os.path.isdir('miis_fc') else []
pool = {'n': len(uniq), 'ps': ps, 'cs': [len(shards[p]) for p in ps], 'm': miis}
json.dump(pool, open('pool.json', 'w'), separators=(',', ':'))
sz = sum(os.path.getsize(f'fc/{p}.json') for p in ps)
print('shards', len(ps), 'total KB', sz // 1024, 'max KB', max(os.path.getsize(f'fc/{p}.json') for p in ps) // 1024)
for fc in ('000099099010', '382252251822'):
    print(fc, 'in pool' if fc in seen else ('SUSPICIOUS' if any(s[1].replace('-', '') == fc for s in susp) else 'NOT FOUND'), seen.get(fc))
