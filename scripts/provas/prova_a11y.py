# Prova Onda 87: /launch → Nova wave → Criar → toast com motivo, 0 pageerror.
import asyncio, json, time, base64, re, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]; SHOT=sys.argv[2]; KEY="sb-njmniwsqwohmigroswnl-auth-token"; exp=int(time.time())+3600
def b64(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip("=")
tok=f"{b64({'alg':'HS256'})}.{b64({'sub':'00000000-0000-0000-0000-000000000001','email':'e2e@plm.local','role':'authenticated','exp':exp,'aud':'authenticated'})}.x"
sess={"access_token":tok,"refresh_token":"x","expires_at":exp,"expires_in":3600,"token_type":"bearer","user":{"id":"00000000-0000-0000-0000-000000000001","email":"e2e@plm.local","aud":"authenticated","role":"authenticated","app_metadata":{},"user_metadata":{},"created_at":"2026-01-01T00:00:00Z"}}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":1400,"height":900})).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        await pg.goto(BASE+"/supplier-portal", wait_until="domcontentloaded"); await pg.wait_for_timeout(15000)
        sb=await pg.locator("button[aria-label], button[title]").evaluate_all("els => els.map(e => e.getAttribute('aria-label') || e.getAttribute('title')).filter(Boolean).slice(0,8)")
        print("botões rotulados:", sb)
        await pg.locator("button,[role=tab]", has_text=re.compile("^Fornecedores$")).first.click(); await pg.wait_for_timeout(1000)
        await pg.locator("button", has_text=re.compile("Novo fornecedor|Cadastrar|Adicionar")).first.click(); await pg.wait_for_timeout(1000)
        names=await pg.locator("[role=dialog] button").evaluate_all("els => els.map(e => (e.getAttribute('aria-label') || e.innerText || '').trim())")
        print("botões do diálogo:", names)
        print("toasts:", [await t.inner_text() for t in await pg.locator("[data-sonner-toast]").all()])
        await pg.screenshot(path=SHOT); print("pageerror:", len(errs), errs[:2]); await b.close()
asyncio.run(main())
