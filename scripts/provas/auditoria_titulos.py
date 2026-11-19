# Auditoria Onda 111: título do documento, h1 e lang por rota autenticada.
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

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":1400,"height":900})).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        prob=0
        for rota in ROTAS:
            try:
                await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_timeout(4000)
                r=await pg.evaluate("""() => ({t: document.title, lang: document.documentElement.lang, h1: [...document.querySelectorAll('h1')].filter(h=>h.getBoundingClientRect().height>0).map(h=>h.innerText.trim().slice(0,50)), main: document.querySelectorAll('main').length})""")
            except Exception as e:
                r={"t":"ERRO "+str(e)[:50],"lang":"","h1":[],"main":0}
            flag=[]
            if len(r["h1"])!=1: flag.append(f"h1={len(r['h1'])}")
            if not r["t"] or r["t"].startswith("USE MODA PLM AI | Next-Gen"): flag.append("titulo-generico")
            if r["lang"]!="pt-BR": flag.append("lang="+r["lang"])
            if r["main"]!=1: flag.append(f"main={r['main']}")
            if flag: prob+=1
            print(f"{rota:28s} | {r['t'][:40]:40s} | {r['h1']} | {' '.join(flag)}")
        print("TOTAL rotas com problema:", prob, "| pageerror:", len(errs))
        await pg.screenshot(path=SHOT); await b.close()
asyncio.run(main())
