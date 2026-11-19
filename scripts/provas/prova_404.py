import asyncio, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]; SHOT=sys.argv[2]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1200,"height":700})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        r=await pg.goto(BASE+"/rota-que-nao-existe-95", wait_until="domcontentloaded"); await pg.wait_for_timeout(6000)
        print("status:", r.status if r else None)
        print("h1/h2:", await pg.locator("h1,h2").all_inner_texts())
        print("links/botões:", [t for t in await pg.locator("a,button").all_inner_texts() if t.strip()][:6])
        await pg.screenshot(path=SHOT); print("pageerror:", len(errs)); await b.close()
asyncio.run(main())
