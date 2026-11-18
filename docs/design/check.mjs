// Run: node docs/design/check.mjs. Requires local Chrome; no npm dependencies.
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Script } from 'node:vm';

const directory = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(directory, 'index.html'), 'utf8');
const snapshot = JSON.parse(html.match(/<script id="snapshot" type="application\/json">([\s\S]*?)<\/script>/)[1]);
new Script(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
assert.equal(snapshot.total, 1061605);
assert.ok(html.includes('lang="en"'));
assert.ok(!/[\u00c0-\u024f\u1e00-\u1eff]/u.test(html), "Unexpected non-English interface copy");
assert.equal(snapshot.subjects.length, 9);
assert.equal(snapshot.combinations.length, 6);
for (const s of snapshot.subjects) {
  assert.equal(s.bins.length, 20);
  assert.equal(s.bins.reduce((a,b)=>a+b), s.valid);
  assert.equal(s.bands.reduce((a,b)=>a+b), s.valid);
  assert.equal(s.valid + s.missing, snapshot.total);
}
for (const g of snapshot.combinations) {
  assert.equal(g.bins.length, 30);
  assert.equal(g.bins.reduce((a,b)=>a+b), g.valid);
  assert.equal(g.top.length, 10);
  for (let i = 0; i < g.top.length; i++) {
    const row = g.top[i];
    assert.match(row.sbd, /^[0-9]{8}$/);
    assert.ok(Math.abs(row.scores.reduce((a,b)=>a+b) - row.total) < 1e-8);
    if (g.english) assert.equal(snapshot.samples[row.sbd].language, 'N1');
    if (i) {
      const previous = g.top[i-1];
      assert.ok(previous.total > row.total || (previous.total === row.total && previous.sbd < row.sbd));
    }
  }
}
assert.ok(Object.values(snapshot.samples).some(c=>c.scores.some(s=>s===0)));
const profile = await mkdtemp(join(tmpdir(), 'g-scores-design-'));
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'], {stdio:['ignore','ignore','pipe']});
let socket;
const errors = [];
try {
  const endpoint = await new Promise((resolve,reject)=>{
    let log='';
    const timer=setTimeout(()=>reject(new Error('Chrome startup timed out')),15000);
    chrome.once('error',e=>{clearTimeout(timer);reject(e);});
    chrome.once('exit',code=>{clearTimeout(timer);reject(new Error('Chrome exited: '+code));});
    chrome.stderr.on('data',buffer=>{log+=buffer;const match=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
  });
  const pages = await (await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list')).json();
  socket = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;
  const pending=new Map();
  socket.addEventListener('message',e=>{const event=JSON.parse(e.data);if(event.id){const handler=pending.get(event.id);if(handler){pending.delete(event.id);clearTimeout(handler.timer);event.error?handler.reject(new Error(JSON.stringify(event.error))):handler.resolve(event.result);}}else if(event.method==='Runtime.exceptionThrown')errors.push(event.params.exceptionDetails.text);else if(event.method==='Runtime.consoleAPICalled'&&event.params.type==='error')errors.push(JSON.stringify(event.params.args));});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;const timer=setTimeout(()=>{pending.delete(current);reject(new Error('Timed out: '+method));},10000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const wait=async expression=>{for(let i=0;i<50;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw new Error('Condition not met: '+expression);};
  const navigate=async route=>{await send('Page.navigate',{url:pathToFileURL(join(directory,'index.html')).href+'#'+route});await wait('document.readyState === "complete" && !!document.querySelector("main h1")');};
  const screenshots=join(directory,'screenshots');
  await mkdir(screenshots,{recursive:true});
  await send('Page.enable');await send('Runtime.enable');
  const screenshot=async name=>{const layout=await send('Page.getLayoutMetrics');const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:layout.cssContentSize.width,height:layout.cssContentSize.height,scale:1}});await writeFile(join(screenshots,name+'.png'),Buffer.from(shot.data,'base64'));};
  for(const [width,height,prefix] of [[1440,1000,'desktop'],[768,1024,'tablet'],[390,844,'mobile']]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:prefix==='mobile'});
    for(const [route,name] of [['/','overview'],['/scores','score-lookup'],['/reports','subject-reports'],['/rankings','combination-rankings']]){
      await navigate(route);
      assert.equal(await evaluate('document.querySelectorAll(".page-heading > h1.eyebrow").length'),1);
      assert.equal(await evaluate('document.querySelectorAll(".page-heading .description").length'),0);
      assert.equal(await evaluate('document.querySelectorAll("nav a[aria-current=page]").length'),1);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),prefix+' overflow: '+route);
      if(route==='/scores'){
        await evaluate('document.querySelector("[data-sample]").click()');
        assert.equal(await evaluate('document.getElementById("lookup-result").getAttribute("aria-busy")'),'true');
        await wait('!!document.getElementById("result-sbd")');
        assert.equal(await evaluate('document.getElementById("result-sbd").textContent'),'01000001');
        assert.ok(await evaluate('document.getElementById("lookup-result").textContent.includes("Not taken")'));
      }
      if(prefix!=='tablet')await screenshot(prefix+'-'+name);
      console.log('PASS',prefix,route);
    }
  }
  await navigate('/reports');
  for(const s of snapshot.subjects){
    await evaluate(`document.getElementById('subject-filter').value=${JSON.stringify(s.key)};document.getElementById('subject-filter').dispatchEvent(new Event('change'))`);
    assert.equal(await evaluate('document.querySelectorAll("#subject-chart-hint").length'),1);
    assert.ok(await evaluate(`document.getElementById('subject-hist-title').textContent.includes(${JSON.stringify(s.name)})`));
    assert.equal(await evaluate('document.querySelectorAll("[data-chart=subject-chart]").length'),20);
    assert.equal(await evaluate('document.activeElement.id'),'subject-filter');
  }
  await navigate('/rankings');
  for(const g of snapshot.combinations){
    await evaluate(`document.getElementById('tab-${g.key}').click()`);
    assert.equal(await evaluate('document.querySelectorAll("[data-chart=combination-chart]").length'),30);
    assert.equal(await evaluate('document.querySelectorAll(".data-table tbody tr").length'),40);
    assert.equal(await evaluate('document.querySelector("[aria-pressed=true]").id'),'tab-'+g.key);
  }
  await evaluate('document.querySelector(".data-table tbody a").click()');
  await wait('!!document.getElementById("result-sbd")');
  assert.equal(await evaluate('document.getElementById("result-sbd").textContent'),snapshot.combinations.at(-1).top[0].sbd);
  await navigate('/scores');
  await evaluate('document.getElementById("sbd").value="123";document.getElementById("lookup-form").requestSubmit()');
  assert.equal(await evaluate('document.getElementById("sbd").getAttribute("aria-invalid")'),'true');
  assert.equal(await evaluate('document.activeElement.id'),'sbd');
  await evaluate('document.getElementById("sbd").value="99999999";document.getElementById("lookup-form").requestSubmit()');
  await wait('!!document.getElementById("not-found")');
  await evaluate('document.getElementById("edit-sbd").click()');
  assert.equal(await evaluate('document.activeElement.id'),'sbd');
  const zero=Object.values(snapshot.samples).find(c=>c.scores.some(s=>s===0));
  await evaluate(`document.getElementById('sbd').value=${JSON.stringify(zero.sbd)};document.getElementById('lookup-form').requestSubmit()`);
  await wait('!!document.getElementById("result-sbd")');
  assert.ok(await evaluate('document.querySelector(".score-grid").textContent.includes("0.00")'));
  for(const route of ['/','/scores','/reports','/rankings']){
    await navigate(route);
    for(const state of ['loading','empty','error']){
      await evaluate(`document.getElementById('review-state').value='${state}';document.getElementById('review-state').dispatchEvent(new Event('change'))`);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
      if(state==='loading')assert.equal(await evaluate('document.querySelector("main").getAttribute("aria-busy")'),'true');
      if(state==='error'){
        await evaluate('document.getElementById("retry").click()');
        assert.equal(await evaluate('document.getElementById("review-state").value'),'ready');
        assert.equal(await evaluate('document.activeElement.id'),'main');
      }
    }
  }
  await navigate('/scores');
  await evaluate('document.getElementById("sbd").focus()');
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate('document.activeElement.id'),'lookup-submit');
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate('document.activeElement.id'),'sbd');
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});
  assert.equal(await evaluate('document.getElementById("sbd").getAttribute("aria-invalid")'),'true');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'));
  await navigate('/unknown');assert.ok(await evaluate('document.querySelector("main").textContent.includes("This page is not available")'));
  assert.deepEqual(errors,[]);
  console.log('PASS snapshot, 9 subjects, 6 combinations, lookup/zero/missing/not-found, states/retry, keyboard, reduced motion, console.');
  console.log('Saved 8 screenshots to '+screenshots);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await new Promise(resolve=>{if(chrome.exitCode!==null)resolve();else{chrome.once('exit',resolve);setTimeout(resolve,3000).unref();}});
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
