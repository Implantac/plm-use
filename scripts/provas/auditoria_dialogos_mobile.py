# Auditoria Onda 114: diálogos de criação em viewport móvel (390px): cabem na tela? rolam? campos legíveis?
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

import re as _re
ABRE=_re.compile(r"^(Nov[ao]\b|Adicionar\b|Criar\b|Registrar\b|Cadastrar\b|Homologar\b)")
JS2=r"""() => {
  const d=document.querySelector('[role=dialog]'); if(!d) return null;
  const out=[]; const r=d.getBoundingClientRect(); const H=window.innerHeight, W=document.documentElement.clientWidth;
  const cs=getComputedStyle(d);
  const rola = ['auto','scroll'].includes(cs.overflowY) || [...d.querySelectorAll('*')].some(e=>{const c=getComputedStyle(e).overflowY; return (c==='auto'||c==='scroll') && e.scrollHeight>e.clientHeight+2;});
  if (r.height > H+2 && !rola) out.push('dialogo-maior-que-tela-sem-rolagem: '+Math.round(r.height)+'>'+H);
  if (r.left < -2 || r.right > W+2) out.push('dialogo-fora-da-largura: '+Math.round(r.left)+'..'+Math.round(r.right));
  let peq=0; for (const i of d.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [role=combobox]')) { const f=parseFloat(getComputedStyle(i).fontSize); if (f<16) peq++; }
  if (peq) out.push('campos<16px(zoom iOS): '+peq);
  const btns=[...d.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height>0);
  const submit=btns.find(b=>/^(salvar|criar|cadastrar|adicionar|confirmar|registrar|homologar|enviar|gerar)/i.test((b.innerText||'').trim()));
  if (submit) { const b=submit.getBoundingClientRect(); if (b.bottom > H+2 && !rola) out.push('botao-principal-abaixo-da-dobra: '+Math.round(b.bottom)); }
  return {out, h: Math.round(r.height), rola, campos: d.querySelectorAll('input,textarea,select,[role=combobox]').length}; }"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE, wait_until="domcontentloaded")
        await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(sess))})")
        prob=0; abertos=0
        for rota in ROTAS:
            try:
                await pg.goto(BASE+"/"+rota, wait_until="domcontentloaded"); await pg.wait_for_selector("main", timeout=60000); await pg.wait_for_timeout(2500)
                btn=pg.get_by_role("button", name=ABRE).first
                if not (await btn.count() and await btn.is_visible()): continue
                await btn.click(); await pg.wait_for_timeout(1200)
                r=await pg.evaluate(JS2)
                if not r: continue
                abertos+=1
                flag=r["out"]
                print(f"{rota:22s} | h={r['h']:4d} rola={str(r['rola']):5s} campos={r['campos']:2d} | {' ; '.join(flag)}")
                if flag: prob+=1
                await pg.keyboard.press("Escape")
            except Exception as e:
                print(rota, "ERRO", str(e)[:80])
        print("TOTAL dialogos abertos:", abertos, "| com problema:", prob, "| pageerror:", len(errs))
        await pg.screenshot(path=SHOT); await b.close()
asyncio.run(main())
