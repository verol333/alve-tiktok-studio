const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled']});
 const ctx=await b.newContext({locale:'fr-FR',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',viewport:{width:1366,height:800}});
 const p=await ctx.newPage();
 p.on('response',async r=>{ if(/auth|login|getuser/i.test(r.url())&&r.request().method()==='POST'){ let t='';try{t=(await r.text()).slice(0,400)}catch{} console.log('RESP',r.status(),r.url(),t);} });
 await p.goto('https://megapari.africa/fr',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(10000);
 console.log('URL',p.url(),'TITLE',await p.title());
 const els=await p.$$eval('button,a',n=>n.filter(e=>e.offsetParent).map(e=>(e.innerText||'').trim()).filter(t=>t&&t.length<30).slice(0,40));
 console.log('BTNS',JSON.stringify(els));
 const c=p.locator('button:visible, a:visible').filter({hasText:/connexion|se connecter|log ?in/i}).first();
 try{await c.click({timeout:8000});}catch(e){console.log('NOBTN')}
 await p.waitForTimeout(3000);
 console.log('INPUTS',JSON.stringify(await p.$$eval('input',n=>n.filter(e=>e.offsetParent).map(e=>e.type+':'+(e.name||e.id||e.placeholder)))));
 const pw=p.locator('input[type=password]:visible').first();
 await pw.waitFor({timeout:8000});
 const form=pw.locator('xpath=ancestor::form[1]');
 await form.locator('input:not([type=password]):not([type=checkbox]):not([type=hidden]):visible').first().fill(process.env.ML);
 await pw.fill(process.env.MP);
 await form.locator('button[type=submit]:visible, button:visible').filter({hasText:/connect/i}).first().click();
 await p.waitForTimeout(15000);
 console.log('TEXT_AFTER',(await p.innerText('body')).slice(0,300).replace(/\n/g,' | '));
 const ck=(await ctx.cookies()).map(c=>c.name);
 console.log('COOKIES',JSON.stringify(ck));
 await b.close();
})().catch(e=>{console.log('ERR',e.message.slice(0,300));process.exit(0)});