import os
# Auditoria Onda 117: axe-core (WCAG 2.1 AA) por rota autenticada — violações serious/critical.
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

AXE=open(os.path.join(os.path.dirname(__file__),"..","..","node_modules","axe-core","axe.min.js")).read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await (await b.new_context(viewport={"width":1400,"height":900})).new_page()
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        total={}; rotas_ruins=0
        for rota in ROTAS:
            try:
                await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=60000); await pg.wait_for_timeout(2500)
                await pg.add_script_tag(content=AXE)
                r=await pg.evaluate("async () => { const r=await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}); return r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id, n:v.nodes.length, ex:v.nodes.slice(0,2).map(x=>x.target[0]+' :: '+(x.html||'').slice(0,90))})); }")
            except Exception as e:
                print(f"{rota:22s} | ERRO {str(e)[:60]}"); continue
            if r: rotas_ruins+=1
            print(f"{rota:22s} | " + ("; ".join(f"{v['id']}×{v['n']}" for v in r) or "ok"))
            for v in r:
                total.setdefault(v["id"],[0,[]]); total[v["id"]][0]+=v["n"]; total[v["id"]][1]+=v["ex"]
        print("\n== RESUMO ==", f"rotas com violação: {rotas_ruins}/{len(ROTAS)}")
        for k,(n,ex) in sorted(total.items(), key=lambda kv:-kv[1][0]):
            print(f"{k}: {n}"); [print("   ", e) for e in ex[:4]]
        try:
            await pg.goto(BASE+"/dashboard", wait_until="domcontentloaded"); await pg.wait_for_timeout(2500); await pg.screenshot(path=SHOT, timeout=10000)
        except Exception: pass
        await b.close()
asyncio.run(main())
