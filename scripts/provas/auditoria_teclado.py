# Auditoria Onda 116: teclado — Tabs até o conteúdo (skip link), Escape fecha o menu off-canvas, foco entra no menu.
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
        b=await p.chromium.launch()
        # desktop: quantos Tabs até o foco entrar no <main>?
        pg=await (await b.new_context(viewport={"width":1400,"height":900})).new_page()
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        res={}
        for rota in ROTAS[:6]:
            await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=60000); await pg.wait_for_timeout(4000)
            n=None; primeiro=None
            for i in range(1,80):
                await pg.keyboard.press("Tab")
                info=await pg.evaluate("() => { const e=document.activeElement; return {inMain: !!e.closest('main'), txt:(e.getAttribute('aria-label')||e.innerText||e.tagName||'').trim().slice(0,30)}; }")
                if i==1:
                    primeiro=info["txt"]
                    if "Pular" in primeiro:
                        await pg.keyboard.press("Enter"); await pg.wait_for_timeout(200)
                        info=await pg.evaluate("() => { const e=document.activeElement; return {inMain: !!e.closest('main')||e.tagName==='MAIN', txt:(e.id||e.tagName)}; }")
                if info["inMain"]: n=i; break
            res[rota]=(n,primeiro)
            print(f"{rota:22s} | primeiro Tab: {primeiro!r:34s} | Tabs até o conteúdo: {n}")
        await pg.close()
        # celular: menu off-canvas — foco entra? Escape fecha?
        pg=await (await b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)).new_page()
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        await pg.goto(BASE+"/dashboard", wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=60000); await pg.wait_for_timeout(2000)
        btn=pg.get_by_role("button", name="Expandir menu lateral")
        if await btn.count():
            await btn.focus(); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(400)
            foco=await pg.evaluate("() => { const e=document.activeElement; return {noAside: !!e.closest('aside'), txt:(e.getAttribute('aria-label')||e.innerText||e.tagName).trim().slice(0,30)}; }")
            print("menu aberto por teclado → foco:", foco)
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(400)
            print("Escape fecha o menu:", not await pg.locator("aside").first.is_visible())
        await pg.screenshot(path=SHOT); await b.close()
asyncio.run(main())
