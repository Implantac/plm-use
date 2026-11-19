# Auditoria Onda 112: overflow horizontal e alvos de toque pequenos em viewport móvel (390px).
import asyncio, json, time, base64, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]; SHOT=sys.argv[2]; ROTAS=(open(sys.argv[3]).read().split() if len(sys.argv)>3 else [r.removeprefix("_authenticated.").removesuffix(".tsx").replace(".","/") for r in sorted(__import__("os").listdir(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../src/routes"))) if r.startswith("_authenticated.") and r not in ("_authenticated.index.tsx","_authenticated.tsx")])
KEY="sb-njmniwsqwohmigroswnl-auth-token"; exp=int(time.time())+3600
def b64(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip("=")
tok=f"{b64({'alg':'HS256'})}.{b64({'sub':'00000000-0000-0000-0000-000000000001','email':'e2e@plm.local','role':'authenticated','exp':exp,'aud':'authenticated'})}.x"
sess={"access_token":tok,"refresh_token":"x","expires_at":exp,"expires_in":3600,"token_type":"bearer","user":{"id":"00000000-0000-0000-0000-000000000001","email":"e2e@plm.local","aud":"authenticated","role":"authenticated","app_metadata":{},"user_metadata":{},"created_at":"2026-01-01T00:00:00Z"}}
JS=r"""() => {
  const out=[];
  const sel='button, [role=button], [role=combobox], [role=checkbox], [role=switch], [role=tab], input:not([type=hidden]), textarea, select';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[data-sonner-toaster]') || el.getAttribute('aria-hidden')==='true') continue;
    const r=el.getBoundingClientRect(); if (r.width===0 && r.height===0) continue;
    const lbl = el.id ? document.querySelector('label[for="'+CSS.escape(el.id)+'"]') : null;
    const name=(el.getAttribute('aria-label')||'').trim() || (el.getAttribute('aria-labelledby') ? 'LB' : '') || (el.getAttribute('title')||'').trim() || (el.innerText||'').trim() || (el.getAttribute('placeholder')||'').trim() || (lbl ? 'LBL' : '') || (el.closest('label') ? 'WRAP' : '') || (el.querySelector('img[alt]')?.getAttribute('alt')||'').trim();
    if (!name) {const c=el.cloneNode(true); c.removeAttribute('class'); for (const x of c.querySelectorAll('[class]')) x.removeAttribute('class'); out.push((c.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>').slice(0,160)+' | PAI: '+(el.parentElement?.getAttribute('data-testid')||el.parentElement?.id||el.parentElement?.tagName)+' | TXT-PAI: '+(el.parentElement?.innerText||'').slice(0,40)).replace(/\s+/g,' '));}
  }
  return out; }"""

JS2=r"""() => {
  const out=[]; const de=document.documentElement;
  if (de.scrollWidth > de.clientWidth+2) {
    out.push('overflow-x: '+de.scrollWidth+'>'+de.clientWidth);
    const w=de.clientWidth;
    for (const el of document.querySelectorAll('body *')) {
      const r=el.getBoundingClientRect();
      if (r.right > w+8 && r.width>40 && getComputedStyle(el).position!=='fixed') { const c=el.cloneNode(false); out.push('  largo: '+c.outerHTML.slice(0,100)+' right='+Math.round(r.right)); if (out.length>6) break; }
    }
  }
  // conteúdo cortado: elemento dentro do main que ultrapassa a viewport sem um ancestral rolável horizontal
  const scrollable=(el)=>{for(let a=el.parentElement;a&&a.tagName!=='MAIN';a=a.parentElement){const o=getComputedStyle(a).overflowX;if(o==='auto'||o==='scroll')return true; if((o==='hidden'||o==='clip')&&a.getBoundingClientRect().right<=de.clientWidth+8)return true; /* truncate intencional */}return false;};
  let cortados=0, ex=[];
  for (const el of document.querySelectorAll('main *')) {
    const r=el.getBoundingClientRect(); if (r.width<40||r.height<10) continue;
    if (r.right > de.clientWidth+8 && !scrollable(el) && getComputedStyle(el).position!=='fixed') { cortados++; if (ex.length<3) ex.push(el.tagName+'.'+String(el.className).slice(0,50)+' right='+Math.round(r.right)); }
  }
  if (cortados) out.push('cortados: '+cortados+' ex: '+ex.join(' | '));
  const m=document.querySelector('main'); if (m) { const mw=m.getBoundingClientRect().width; if (mw < de.clientWidth*0.8) out.push('main-estreito: '+Math.round(mw)+'px de '+de.clientWidth); }
  let small=0;
  for (const el of document.querySelectorAll('main button, main a[href], main [role=button]')) {
    const r=el.getBoundingClientRect(); if (r.width===0||r.height===0) continue;
    if (r.top<0||r.top>window.innerHeight) continue;
    if (getComputedStyle(el).opacity==='0') continue;
    if (el.closest('nav[aria-label=Breadcrumb i], p, li, td')) continue; // links inline em texto: exceção da WCAG 2.5.8
    if (el.tagName==='A' && getComputedStyle(el).display==='inline') continue;
    if (r.width<24 || r.height<24) { small++; out.push('  alvo: '+Math.round(r.width)+'x'+Math.round(r.height)+' '+el.tagName+' '+(el.getAttribute('aria-label')||el.innerText||'').trim().slice(0,30)); }
  }
  if (small) out.push('alvos<24px: '+small);
  return out; }"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        total=0; por={}
        for rota in ROTAS:
            try:
                await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=60000); await pg.wait_for_timeout(3500)
                l=await pg.evaluate(JS2)
            except Exception as e:
                l=["ERRO "+str(e)[:60]]
            if l: por[rota]=l; total+=1
        print("TOTAL rotas com problema:", total, "| pageerror:", len(errs))
        for r,l in por.items():
            print("==", r)
            for x in l[:7]: print("   ", x[:150])
        await pg.screenshot(path=SHOT); await b.close()
asyncio.run(main())
