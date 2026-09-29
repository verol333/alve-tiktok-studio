const { chromium } = require('playwright');
(async()=>{
 const cc='ZA,NG,KE,CI,CM,GH,EG,MA,TZ,UG,SN,CD,CG,BF,BJ,TG,ZM,MZ,RW,ET';
 let list=[];
 try{const t=await (await fetch('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=protocolipport&format=text&country='+cc+'&timeout=8000')).text();list=t.split(/\s+/).filter(Boolean);}catch(e){console.log('LISTERR',e.message)}
 console.log('PROXIES',list.length);
 const t0=Date.now();
 list=['http://102.213.84.244:8080',...list];
 for(const px of list.slice(0,40)){
  if(Date.now()-t0>300000)break;
  let b;
  try{
   b=await chromium.launch({headless:true,proxy:{server:px},args:['--disable-blink-features=AutomationControlled']});
   const ctx=await b.newContext({locale:'fr-FR',viewport:{width:1366,height:800},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'});
   const p=await ctx.newPage();
   p.on('response',async r=>{ if(/auth|login/i.test(r.url())&&r.request().method()==='POST'){let t='';try{t=(await r.text()).slice(0,300)}catch{} console.log('RESP',r.status(),r.url(),t);} });
   await p.goto('https://megapari.africa/fr',{waitUntil:'domcontentloaded',timeout:25000});
   await p.waitForTimeout(5000);
   console.log('PX',px,'->',p.url());
   if(/block/.test(p.url())||!/mp\.pro/.test(p.url())){await b.close();continue;}
   await p.locator('header button:visible, header a:visible, button:visible').filter({hasText:/^\s*se connecter\s*$/i}).first().click({timeout:15000});
   await p.waitForTimeout(3000);
   console.log('ALLINPUTS',JSON.stringify(await p.locator('input:visible').evaluateAll(a=>a.map(i=>[i.type,i.name,i.placeholder,i.closest('form')?.className?.slice(0,40)]))));
   const via=p.locator('form:visible').filter({hasText:/souvenir/i}).last().locator('xpath=..').locator('button:visible, a:visible');
   console.log('VIA',JSON.stringify(await via.evaluateAll(a=>a.map(e=>[e.innerText.slice(0,20),e.getAttribute('title'),e.getAttribute('aria-label'),e.className.slice(0,60)]))));
   const idBtn=via.filter({has:p.locator('[class*=mail], [class*=email], [class*=id]')}).first();
   try{await idBtn.click({timeout:3000});console.log('IDCLICK1')}catch{ try{await p.locator('[class*=auth] [class*=mail]:visible, [class*=auth] [class*=email]:visible, [title*=mail i]:visible').first().click({timeout:3000});console.log('IDCLICK2')}catch{console.log('NOIDBTN')} }
   await p.waitForTimeout(2000);
   console.log('INPUTS2',JSON.stringify(await p.locator('input:visible').evaluateAll(a=>a.map(i=>[i.type,i.name,i.placeholder]))));
   const lf=p.locator('form:visible').filter({hasText:/souvenir/i}).last();
   const idIn=lf.locator('input:visible:not([type=password]):not([type=checkbox]):not([type=radio])').first();
   await idIn.fill(process.env.ML);
   await lf.locator('input[type=password]:visible').first().fill(process.env.MP);
   await lf.locator('button:visible').filter({hasText:/connect/i}).last().click();
   await p.waitForTimeout(20000);
   await p.screenshot({path:'after.png'});
   console.log('TEXT_AFTER',(await p.innerText('body')).slice(0,300).replace(/\n/g,' | '));
   console.log('COOKIES',JSON.stringify((await ctx.cookies()).map(c=>c.name)));
   await b.close(); break;
  }catch(e){console.log('PXERR',px,e.message.slice(0,90)); try{await b.close()}catch{}}
 }
})();