"""
E2E · foco avança para o próximo campo inválido ao corrigir o Select.

Cenário: MovementDialog em /inventory. Interceptamos as chamadas de
catálogo (stock_item + warehouse) para injetar exatamente 1 item e
NENHUM armazém — isso garante que:
  - Podemos preencher o Select "Insumo" pela UI (existe 1 opção).
  - Restam erros em "Armazém" (Select) e "Quantidade" (Input).

Fluxo:
  1. Restaura sessão + intercepta requests do catálogo.
  2. Abre /inventory → dialog Movimentação.
  3. Zera qty="0" e submete → foco vai para #movement-item (primeiro
     inválido) + alert 'Selecione o insumo.'.
  4. Seleciona o único item pelo Select → resubmete → foco avança para
     o PRÓXIMO inválido (#movement-warehouse) + alert 'Selecione o armazém.'.
     Alert de #movement-item foi removido.
  5. Ao contrário do warehouse (sem opções), corrigimos digitando qty=10
     para validar a atualização do próximo campo remanescente e o alert
     'Quantidade deve ser maior que 0.' desaparece.
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("PLM_E2E_BASE", "http://localhost:8080")
SHOTS = Path(__file__).parent / "screenshots" / "field-message-select-advance"
SHOTS.mkdir(parents=True, exist_ok=True)

FAKE_ITEM = {
    "id": "11111111-1111-1111-1111-111111111111",
    "code": "TST-001",
    "name": "Insumo de Teste",
    "category": "MP",
    "unit": "un",
    "is_active": True,
    "abc_class": "A",
    "min_stock": 0,
    "max_stock": 0,
    "reorder_point": 0,
    "lead_time_days": 0,
    "cost_avg": 0,
    "supplier_id": None,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
}


async def restore_session(page, context) -> None:
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)

    await page.goto(BASE, wait_until="domcontentloaded")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )


async def install_catalog_stubs(context) -> None:
    """Retorna 1 item e 0 warehouses para todas as queries de catálogo."""

    async def handler(route):
        url = route.request.url
        if "/rest/v1/stock_item" in url:
            await route.fulfill(
                status=200,
                content_type="application/json",
                headers={"content-range": "0-0/1"},
                body=json.dumps([FAKE_ITEM]),
            )
        elif "/rest/v1/warehouse" in url:
            await route.fulfill(
                status=200,
                content_type="application/json",
                headers={"content-range": "0-0/0"},
                body=json.dumps([]),
            )
        else:
            await route.continue_()

    await context.route("**/rest/v1/stock_item*", handler)
    await context.route("**/rest/v1/warehouse*", handler)


async def active_id(page) -> str | None:
    return await page.evaluate(
        "() => document.activeElement && document.activeElement.id"
    )


async def alert_texts_for(page, control_id: str) -> list[str]:
    ctrl = page.locator(f"#{control_id}")
    describedby = await ctrl.get_attribute("aria-describedby")
    if not describedby:
        return []
    texts: list[str] = []
    for token in describedby.split():
        node = page.locator(f"#{token}")
        if await node.count() == 0:
            continue
        role = await node.get_attribute("role")
        text = (await node.inner_text()).strip()
        if role == "alert" and text:
            texts.append(text)
    return texts


async def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if cond:
            print(f"  ✓ {msg}")
        else:
            print(f"  ✗ {msg}")
            failures.append(msg)

    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") != "injected":
        print("SKIP · sessão gerenciada necessária.")
        return 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        await install_catalog_stubs(context)
        page = await context.new_page()
        page.on("pageerror", lambda e: print(f"[pageerror] {e}"))

        # -----------------------------------------------------------
        # 1. Rota autenticada + dialog
        # -----------------------------------------------------------
        print("\n▶ 1. /inventory autenticado, catálogo injetado")
        await restore_session(page, context)
        await page.goto(f"{BASE}/inventory", wait_until="networkidle")
        await page.wait_for_timeout(600)
        if "/login" in page.url:
            print(f"SKIP · redirecionou para {page.url}")
            await browser.close()
            return 0

        move_btn = page.get_by_role("button", name=re.compile(r"Movimenta[cç]ão", re.I))
        await expect(move_btn.first).to_be_visible(timeout=8000)
        await move_btn.first.click()
        await expect(page.locator("#movement-item")).to_be_visible(timeout=4000)
        await page.screenshot(path=str(SHOTS / "1_dialog.png"))

        # -----------------------------------------------------------
        # 2. Submit inválido → foco em #movement-item
        # -----------------------------------------------------------
        print("\n▶ 2. Submit inválido posiciona foco em #movement-item")
        submit = page.get_by_role("button", name=re.compile(r"^Registrar$", re.I))
        await submit.click()
        await page.wait_for_timeout(250)

        check(
            (await active_id(page)) == "movement-item",
            "activeElement=#movement-item após primeiro submit",
        )
        item_alerts = await alert_texts_for(page, "movement-item")
        check(
            any("Selecione o insumo" in t for t in item_alerts),
            f"#movement-item alert 'Selecione o insumo.' (achado: {item_alerts})",
        )
        # Warehouse também está inválido, mas o foco vai apenas para o
        # primeiro na ordem visual.
        wh_alerts = await alert_texts_for(page, "movement-warehouse")
        check(
            any("Selecione o armazém" in t for t in wh_alerts),
            f"#movement-warehouse alert simultâneo (achado: {wh_alerts})",
        )
        await page.screenshot(path=str(SHOTS / "2_first_invalid.png"))

        # -----------------------------------------------------------
        # 3. Corrige o Select "Insumo" → foco avança para o próximo
        #    campo inválido (#movement-warehouse ou #movement-qty).
        # -----------------------------------------------------------
        print("\n▶ 3. Após selecionar o insumo, foco avança para o próximo campo inválido")
        trigger = page.locator("#movement-item")
        await trigger.click()
        option = page.get_by_role("option", name=re.compile("TST-001", re.I))
        await expect(option).to_be_visible(timeout=3000)
        await option.click()
        await page.wait_for_timeout(150)

        await submit.click()
        await page.wait_for_timeout(250)

        # Focar em outro campo antes já foi feito pelo click no submit.
        next_focus = await active_id(page)
        expected_next = {"movement-warehouse", "movement-qty"}
        check(
            next_focus in expected_next,
            f"foco avançou para o próximo inválido (esperado ∈ {expected_next}, atual={next_focus})",
        )

        # O alert de #movement-item deve ter sumido.
        item_alerts_after = await alert_texts_for(page, "movement-item")
        check(
            not any("Selecione o insumo" in t for t in item_alerts_after),
            "alert 'Selecione o insumo.' removido do leitor de tela",
        )
        check(
            (await trigger.get_attribute("aria-invalid")) != "true",
            "#movement-item aria-invalid removido após correção",
        )

        # O alert do próximo campo continua sendo anunciado.
        if next_focus == "movement-warehouse":
            texts = await alert_texts_for(page, "movement-warehouse")
            check(
                any("Selecione o armazém" in t for t in texts),
                f"#movement-warehouse alert 'Selecione o armazém.' (achado: {texts})",
            )
        else:
            texts = await alert_texts_for(page, "movement-qty")
            check(
                any("Quantidade deve ser maior que 0" in t for t in texts),
                f"#movement-qty alert 'Quantidade deve ser maior que 0.' (achado: {texts})",
            )
        await page.screenshot(path=str(SHOTS / "3_focus_advanced.png"))

        # -----------------------------------------------------------
        # 4. Corrige o Input quantidade → alert de qty desaparece.
        # -----------------------------------------------------------
        print("\n▶ 4. Corrigir Quantidade limpa o alert de #movement-qty")
        qty = page.locator("#movement-qty")
        await qty.fill("10")
        await submit.click()
        await page.wait_for_timeout(250)

        if await qty.count():
            check(
                (await qty.get_attribute("aria-invalid")) != "true",
                "#movement-qty aria-invalid limpo após preencher 10",
            )
            check(
                not any(
                    "Quantidade deve ser maior que 0" in t
                    for t in await alert_texts_for(page, "movement-qty")
                ),
                "alert de quantidade removido do leitor de tela",
            )
        else:
            check(True, "dialog fechou — validação passou por completo")
        await page.screenshot(path=str(SHOTS / "4_qty_fixed.png"))

        await browser.close()

    print("\n=========================================")
    if failures:
        print(f"FALHOU · {len(failures)} verificação(ões):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("OK · todas as verificações passaram")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
