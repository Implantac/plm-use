# Auditoria Onda 110: avisos/erros de console por rota autenticada (dev ou prod).
import asyncio, json, time, base64, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]; SHOT=sys.argv[2]; ROTAS=(open(sys.argv[3]).read().split() if len(sys.argv)>3 else [r.removeprefix("_authenticated.").removesuffix(".tsx").replace(".","/") for r in sorted(__import__("os").listdir(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../src/routes"))) if r.startswith("_authenticated.") and r!="_authenticated.index.tsx"])
KEY="sb-njmniwsqwohmigroswnl-auth-token"; exp=int(time.time())+3600
def b64(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip("=")
tok=f"{b64({'alg':'HS256'})}.{b64({'sub':'00000000-0000-0000-0000-000000000001','email':'e2e@plm.local','role':'authenticated','exp':exp,'aud':'authenticated'})}.x"
sess={"access_token":tok,"refresh_token":"x","expires_at":exp,"expires_in":3600,"token_type":"bearer","user":{"id":"00000000-0000-0000-0000-000000000001","email":"e2e@plm.local","aud":"authenticated","role":"authenticated","app_metadata":{},"user_metadata":{},"created_at":"2026-01-01T00:00:00Z"}}
JS=r"""() => {
  const out=[];
  const sel='button, [role=button], [role=combobox], [role=checkbox], [role=switch], [role=tab], input:not([type=hidden]), textarea, select';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[data-sonner-toaster]')) continue;
    const r=el.getBoundingClientRect(); if (r.width===0 && r.height===0) continue;
    const lbl = el.id ? document.querySelector('label[for="'+CSS.escape(el.id)+'"]') : null;
    const name=(el.getAttribute('aria-label')||'').trim() || (el.getAttribute('aria-labelledby') ? 'LB' : '') || (el.getAttribute('title')||'').trim() || (el.innerText||'').trim() || (el.getAttribute('placeholder')||'').trim() || (lbl ? 'LBL' : '') || (el.closest('label') ? 'WRAP' : '') || (el.querySelector('img[alt]')?.getAttribute('alt')||'').trim();
    if (!name) {const c=el.cloneNode(true); c.removeAttribute('class'); for (const x of c.querySelectorAll('[class]')) x.removeAttribute('class'); out.push((c.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>').slice(0,160)+' | PAI: '+(el.parentElement?.getAttribute('data-testid')||el.parentElement?.id||el.parentElement?.tagName)+' | TXT-PAI: '+(el.parentElement?.innerText||'').slice(0,40)).replace(/\s+/g,' '));}
  }
  return out; }"""

import re as _re
ABRE=_re.compile(r"^(Nov[ao]\b|Adicionar\b|Criar\b|Registrar\b|Cadastrar\b)")
IGN=("Download the React DevTools","[vite]","Failed to load resource","net::ERR","401","403","Download the Vue")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":1400,"height":900})).new_page()
        atual={"r":""}; logs={}; errs=[]
        def on_console(m):
            if m.type in ("warning","error") and not any(i in m.text for i in IGN):
                logs.setdefault(atual["r"],[]).append(m.type+": "+m.text[:200].replace("\n"," "))
        pg.on("console", on_console); pg.on("pageerror", lambda e: errs.append(atual["r"]+": "+str(e)[:160]))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        for rota in ROTAS:
            atual["r"]=rota
            try:
                await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_timeout(5000)
                btn=pg.get_by_role("button", name=ABRE).first
                if await btn.count() and await btn.is_visible():
                    await btn.click(); await pg.wait_for_timeout(1000); await pg.keyboard.press("Escape")
            except Exception as e:
                logs.setdefault(rota,[]).append("ERRO "+str(e)[:80])
        tot=sum(len(v) for v in logs.values())
        print("TOTAL console warn/error:", tot, "| pageerror:", len(errs))
        for r,l in logs.items():
            print("==", r, len(l))
            for x in sorted(set(l))[:6]: print("   ", x[:180])
        for e in errs[:5]: print("PAGEERROR", e)
        await pg.screenshot(path=SHOT); await b.close()
asyncio.run(main())
