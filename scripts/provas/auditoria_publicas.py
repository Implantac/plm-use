# Auditoria Onda 115: páginas públicas (login, raiz, 404) em 390px e 1400px — título, autocomplete, cortes.
import asyncio, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]
JS=r"""() => { const de=document.documentElement; const out={sw:de.scrollWidth, cw:de.clientWidth, h1:[...document.querySelectorAll('h1')].map(h=>h.innerText.trim()).slice(0,3), title:document.title};
 out.inputs=[...document.querySelectorAll('input:not([type=hidden])')].map(i=>({type:i.type, name:i.getAttribute('aria-label')||i.id||i.name||i.placeholder, fs:getComputedStyle(i).fontSize, ac:i.getAttribute('autocomplete'), im:i.getAttribute('inputmode')}));
 out.buttons=[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height>0).map(b=>{const r=b.getBoundingClientRect(); return (b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,25)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' y='+Math.round(r.bottom)});
 out.cortados=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>40&&r.right>de.clientWidth+8}).length;
 out.lang=de.lang; return out; }"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for vp in [{"width":390,"height":844},{"width":1400,"height":900}]:
            pg=await (await b.new_context(viewport=vp, is_mobile=vp["width"]<500, has_touch=vp["width"]<500)).new_page()
            errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
            for path in ["/login","/","/nao-existe"]:
                await pg.goto(BASE+path, wait_until="domcontentloaded"); await pg.wait_for_timeout(6000)
                r=await pg.evaluate(JS); print(vp["width"], path, "->", pg.url.replace(BASE,""), r)
            await pg.screenshot(path=f"/home/user/login-{vp['width']}.png", full_page=True)
            print("pageerror", errs[:2])
        await b.close()
asyncio.run(main())
