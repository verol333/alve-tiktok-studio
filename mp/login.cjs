const { chromium } = require('playwright');
(async()=>{
 const cc='ZA,NG,KE,CI,CM,GH,EG,MA,TZ,UG,SN,CD,CG,BF,BJ,TG,ZM,MZ,RW,ET';
 let list=[];
 const get=async u=>{try{const r=await fetch(u,{signal:AbortSignal.timeout(15000)});return await r.text()}catch(e){console.log('LISTERR',u.slice(0,40));return ''}};
 list.push(...(await get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=protocolipport&format=text&country='+cc+'&timeout=10000')).split(/\s+/).filter(Boolean));
 try{const j=JSON.parse(await get('https://proxylist.geonode.com/api/proxy-list?limit=150&page=1&sort_by=lastChecked&sort_type=desc&protocols=http&country='+cc.split(',').join('%2C')));(j.data||[]).forEach(x=>list.push('http://'+x.ip+':'+x.port));}catch{}
 list=['http://102.213.84.244:8080','http://51.170.133.249:80','http://41.139.164.19:8080',...new Set(list)];
 if(process.env.EXTRA_PX) list.unshift(...process.env.EXTRA_PX.split(','));
 console.log('PROXIES',list.length);
 const t0=Date.now();
 for(const px of list.slice(0,90)){
  if(Date.now()-t0>1200000)break;
  let b;
  try{
   b=await chromium.launch({headless:true,proxy:{server:px},args:['--disable-blink-features=AutomationControlled']});
   const ctx=await b.newContext({locale:'fr-FR',viewport:{width:1366,height:800},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'});
   const p=await ctx.newPage();
   let authOk=null;
   p.on('response',async r=>{ if(/user\/auth|login/i.test(r.url())&&r.request().method()==='POST'){let t='';try{t=(await r.text()).slice(0,300)}catch{} console.log('RESP',r.status(),r.url(),t); if(r.status()===200&&!/error/i.test(t))authOk=true;} });
   await p.goto('https://megapari.bet/fr',{waitUntil:'domcontentloaded',timeout:20000});
   await p.waitForTimeout(5000);
   console.log('PX',px,'->',p.url());
   if(/block/.test(p.url())||!/mp\.pro|megapari/.test(p.url())){await b.close();continue;}
   await p.locator('button:visible, a:visible').filter({hasText:/^\s*(se connecter|connexion)\s*$/i}).first().click({timeout:15000});
   await p.waitForTimeout(3000);
   const pw=p.locator('input[type=password]:visible').first();
   const box=pw.locator('xpath=ancestor::*[.//text()[contains(.,"souvenir")]][1]/..');
   console.log('SWITCH',JSON.stringify(await box.locator('button:visible, a:visible, [role=tab]:visible, label:visible').evaluateAll(a=>a.map(e=>[e.innerText.trim().slice(0,25),e.className.slice(0,50),e.querySelector('use')?.getAttribute('xlink:href')||e.querySelector('use')?.getAttribute('href')||'']))));
   let sw=p.locator('button:visible, a:visible, [role=tab]:visible, label:visible, span:visible').filter({hasText:/e-?mail|identifiant|^\s*ID\s*$/i});
   if(await sw.count()===0) sw=box.locator('button:visible, a:visible').filter({has:p.locator('use[href*=mail], use[*|href*=mail], [class*=mail], [class*=email]')});
   if(await sw.count()){await sw.first().click();console.log('IDMODE_OK')} else console.log('IDMODE_NOTFOUND');
   await p.waitForTimeout(2000);
   console.log('INPUTS2',JSON.stringify(await p.locator('input:visible').evaluateAll(a=>a.map(i=>[i.type,i.name,i.placeholder]))));
   const idIn=p.locator('input:visible:not([type=password]):not([type=checkbox]):not([type=radio]):not([type=tel])').filter({hasNot:p.locator('xpath=self::*[contains(@placeholder,"événement")]')}).first();
   await idIn.fill(process.env.ML);
   await p.locator('input[type=password]:visible').first().fill(process.env.MP);
   await p.locator('input[type=password]:visible').first().press('Enter');
   await p.waitForTimeout(15000);
   await p.screenshot({path:'after.png'});
   const txt=(await p.innerText('body')).slice(0,400).replace(/\n/g,' | ');
   console.log('TEXT_AFTER',txt);
   const ck=(await ctx.cookies()).map(c=>c.name);
   console.log('COOKIES',JSON.stringify(ck));
   const logged=authOk||ck.includes('user_token')||/d[ée]p[ôo]t|solde|mon compte/i.test(txt)&&!/SE CONNECTER|CONNEXION/i.test(txt.slice(0,200));
   console.log(logged?'LOGIN_RESULT=SUCCESS':'LOGIN_RESULT=FAIL');
   await b.close();
   if(logged||authOk===false)break;
   break;
  }catch(e){console.log('PXERR',px,e.message.slice(0,90)); try{await b.close()}catch{}}
 }
})();