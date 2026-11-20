import json, subprocess, time, datetime, base64
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
STUB = open(os.path.join(HERE, 'stub.js')).read()
def stub(uid): return STUB.replace("'user-abc123'", "'%s'" % uid)
today = datetime.datetime.now(datetime.UTC).date()
srv = subprocess.Popen(['python3','-m','http.server','8790','--bind','127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def page(uid, local=None, w=430):
        ctx = b.new_context(viewport={'width':w,'height':900}, permissions=['clipboard-read','clipboard-write']); pg = ctx.new_page(); pg.errs=[]; pg.on('pageerror', lambda e: pg.errs.append(str(e)))
        if local: pg.add_init_script("try{localStorage.setItem('fcdle.v2', %s)}catch(e){}" % json.dumps(json.dumps(local)))
        pg.add_init_script(stub(uid)); pg.goto('http://127.0.0.1:8790/index.html'); pg.wait_for_timeout(500); return pg
    # 1. skip button on a common roll
    pg = page('user-t0'); pg.click('#rollBtn'); pg.wait_for_selector('#skipBtn'); t=time.time(); pg.click('#skipBtn'); pg.wait_for_selector('#todayCard .tile-ep', timeout=5000)
    print('skip: result after %.1fs' % (time.time()-t), '| canvas for common:', pg.locator('canvas').count(), '| errors', pg.errs)
    # 2. fast mode + mythic celebration
    pg = page('user-t11'); pg.check('#fastBox'); pg.check('#soundBox'); pg.click('#rollBtn'); pg.wait_for_selector('#todayCard .tile-ep', timeout=5000); pg.wait_for_timeout(300)
    print('mythic: canvas', pg.locator('canvas').count(), '| glow class', pg.locator('#todayCard .result.fx').count(), '| tier chip', pg.inner_text('#todayCard .verdict .chip'))
    pg.wait_for_timeout(3200); print('canvas cleaned up:', pg.locator('canvas').count()==0)
    pg.screenshot(path='s_fx.png')
    pg.reload(); pg.wait_for_timeout(700); print('after reload no effects:', pg.locator('canvas').count(), pg.locator('.result.fx').count(), '| fast persisted:', pg.evaluate("JSON.parse(localStorage.getItem('fcdle.v2')).fast"))
    # 3. backup / restore
    pg.click('#t-stats'); pg.wait_for_timeout(300); code = pg.input_value('#saveOut'); print('save code:', code[:24]+'...', len(code),'chars')
    st = json.loads(pg.evaluate("localStorage.getItem('fcdle.v2')")); print('unlock leaked into code:', 'unlock' in base64.b64decode(code[7:]).decode())
    # new device, older history
    y = (today - datetime.timedelta(days=1)).isoformat()
    pg2 = page('user-t11'); pg2.click('#t-stats'); pg2.fill('#saveIn', code); pg2.click('#saveRestore'); pg2.wait_for_timeout(1200)
    print('restore:', pg2.inner_text('#saveMsg')); pg2.click('#t-today'); pg2.wait_for_timeout(300); print('today after restore shows result:', pg2.locator('#todayCard .tile-ep').count())
    pg2.click('#saveRestore') if False else None
    # tamper: change the FC for today
    obj = json.loads(base64.b64decode(code[7:]).decode()); obj['d'][0][1] = '123412341234'
    bad = 'FCDLE1:' + base64.b64encode(json.dumps(obj).encode()).decode()
    pg3 = page('user-t11'); pg3.click('#t-stats'); pg3.fill('#saveIn', bad); pg3.click('#saveRestore'); pg3.wait_for_timeout(1200); print('tampered:', pg3.inner_text('#saveMsg'), '| rolls stored:', pg3.evaluate("Object.keys(JSON.parse(localStorage.getItem('fcdle.v2')).days).length"))
    pg3.fill('#saveIn', 'hello'); pg3.click('#saveRestore'); pg3.wait_for_timeout(300); print('garbage:', pg3.inner_text('#saveMsg'))
    # reserved name not exported
    pg4 = page('user-t0', local={'seed':'user-t0','days':{}, 'name':'Steperd','unlock':True}); pg4.click('#rollBtn'); pg4.check('#fastBox') if False else None
    print('overflow stats mobile:', pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'))
    print('errors', pg.errs, pg2.errs, pg3.errs, pg4.errs); b.close()
finally: srv.terminate()
