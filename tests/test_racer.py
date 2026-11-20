import json, subprocess, time, datetime
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
STUB = open(os.path.join(HERE, 'stub.js')).read()
today = datetime.datetime.now(datetime.UTC).date()
days = {}
for i in range(1,7):
    d=(today-datetime.timedelta(days=i)).isoformat(); days[d]={'fc':'%012d'%(1000*i+7),'seed':'user-abc123','t':i}
srv = subprocess.Popen(['python3','-m','http.server','8787','--bind','127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':430,'height':900}, permissions=['clipboard-read','clipboard-write']); pg = ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("try{localStorage.setItem('fcdle.v2', %s)}catch(e){}" % json.dumps(json.dumps({'seed':'user-abc123','days':days,'name':'Tester'})))
    pg.add_init_script(STUB); pg.goto('http://127.0.0.1:8787/index.html'); pg.wait_for_timeout(500)
    pg.click('#rollBtn'); pg.wait_for_selector('#todayCard .tile-ep', timeout=20000); pg.wait_for_timeout(1200)
    print('banner:', pg.inner_text('#achBanner').replace('\n',' '))
    print('pills:', pg.inner_text('#todayCard .pills').replace('\n',' '))
    pg.screenshot(path='s_today2.png', full_page=True)
    pg.click('#t-collection'); pg.wait_for_timeout(300); print('ach summary:', pg.inner_text('#achSummary')); print('ach grid:', pg.inner_text('#achGrid').replace('\n',' | ')[:300])
    pg.click('#t-stats'); pg.wait_for_timeout(300); print('stats ach:', [l for l in pg.inner_text('#statsCard').split('\n') if 'One Week' in l or 'Achievements' in l][:2])
    pg.click('[data-tab=compare]') if False else None
    pg.click('#t-today'); pg.click('[data-compare]'); pg.wait_for_timeout(300)
    print('compare tab on:', pg.locator('#p-compare.on').count()==1, '| mine text starts:', pg.input_value('#mineText')[:40].replace('\n',' '))
    pg.click('#mineCopy'); pg.wait_for_timeout(300); print('clipboard has FCdle:', 'FCdle' in pg.evaluate('navigator.clipboard.readText()'))
    pg.fill('#cmpIn', pg.input_value('#mineText').replace('Tester','Twin') ); pg.click('#cmpGo'); pg.wait_for_timeout(500); print('compare:', pg.inner_text('#cmpMsg'))
    pg.screenshot(path='s_compare2.png', full_page=True)
    # score a code of a known top racer
    pg.click('#t-check'); import subprocess as sp
    top = json.loads(sp.check_output(['node','-e',"const fs=require('fs');let best=null;for(const f of fs.readdirSync('fc').filter(x=>/^\\d+\\.json$/.test(x)))for(const r of JSON.parse(fs.readFileSync('fc/'+f)))if(r[0]===1)best=r;console.log(JSON.stringify(best))"],cwd=ROOT))
    pg.fill('#fcInput', top[1]); pg.wait_for_timeout(900); print('rank1 racer', top[1], '->', pg.inner_text('#checkCard .pills').replace('\n',' ')[:260])
    print('overflow:', pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')); print('errors', errs); b.close()
finally: srv.terminate()
