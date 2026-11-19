# Prova Onda 112: em 390px o menu começa fechado, abre por cima do conteúdo e fecha ao navegar.
import asyncio, json, time, base64, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]; SHOT=sys.argv[2]
KEY="sb-njmniwsqwohmigroswnl-auth-token"; exp=int(time.time())+3600
def b64(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip("=")
tok=f"{b64({'alg':'HS256'})}.{b64({'sub':'00000000-0000-0000-0000-000000000001','email':'e2e@plm.local','role':'authenticated','exp':exp,'aud':'authenticated'})}.x"
sess={"access_token":tok,"refresh_token":"x","expires_at":exp,"expires_in":3600,"token_type":"bearer","user":{"id":"00000000-0000-0000-0000-000000000001","email":"e2e@plm.local","aud":"authenticated","role":"authenticated","app_metadata":{},"user_metadata":{},"created_at":"2026-01-01T00:00:00Z"}}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        await pg.goto(BASE+"/dashboard", wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=90000); await pg.wait_for_timeout(2500)
        aside=pg.locator("aside").first
        mw=await pg.evaluate("document.querySelector('main').getBoundingClientRect().width")
        print("inicial: aside visível:", await aside.is_visible(), "| main:", round(mw), "px")
        await pg.screenshot(path=SHOT.replace(".png","-1-fechado.png"))
        if await pg.get_by_role("button", name="Expandir menu lateral").count():
            await pg.get_by_role("button", name="Expandir menu lateral").click(); await pg.wait_for_timeout(500)
        else:
            print("(menu já estava aberto — comportamento antigo)")
        mw2=await pg.evaluate("document.querySelector('main').getBoundingClientRect().width")
        print("aberto: aside visível:", await aside.is_visible(), "| main:", round(mw2), "px | backdrop:", await pg.get_by_role("button", name="Fechar menu lateral").count())
        await pg.screenshot(path=SHOT.replace(".png","-2-aberto.png"))
        await pg.get_by_role("link", name="Atividade").first.click(); await pg.wait_for_timeout(2500)
        print("após navegar:", pg.url.split("/")[-1], "| aside visível:", await aside.is_visible())
        await pg.screenshot(path=SHOT)
        print("pageerror:", len(errs), errs[:2]); await b.close()
asyncio.run(main())
