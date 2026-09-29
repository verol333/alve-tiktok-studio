const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled']});
 const ctx=await b.newContext({locale:'fr-FR',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',viewport:{width:1366,height:800}});
 const p=await ctx.newPage();
 p.on('response',async r=>{ if(/user\/auth|auth\/secure|getuserdata|UserAuth/i.test(r.url())){ let t='';try{t=(await r.text()).slice(0,500)}catch{} console.log('RESP',r.status(),r.url(),t);} });
 await p.goto('https://megapari.africa/fr',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(8000);
 await p.screenshot({path:'s1.png'});
 const btn=p.locator('text=/^\\s*(Connexion|Se connecter)\\s*$/i').first();
 try{await btn.click({timeout:10000});}catch(e){console.log('NOBTN',e.message)}
 await p.waitForTimeout(3000);
 const pw=p.locator('input[type=password]:visible').first();
 const form=pw.locator('xpath=ancestor::form[1]');
 const login=form.locator('input:not([type=password]):not([type=checkbox]):visible').first();
 await login.fill(process.env.ML); await pw.fill(process.env.MP);
 await p.screenshot({path:'s2.png'});
 await form.locator('button[type=submit], button:has-text("SE CONNECTER")').first().click();
 await p.waitForTimeout(15000);
 await p.screenshot({path:'s3.png'});
 const ck=(await ctx.cookies()).map(c=>c.name);
 console.log('COOKIES',JSON.stringify(ck));
 console.log('HAS_SESSION', ck.some(n=>/^(ua|uhash|user_token|SESSION)$/i.test(n)));
 await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(0)});