"""
E2E · após corrigir todos os campos inválidos, o foco vai para o
primeiro elemento acionável válido (submit) e nenhum FieldMessage com
role="alert" permanece anunciado ao leitor de tela.

Cenário: /login em modo "Criar conta". Interceptamos POST /auth/v1/signup
para evitar chamadas reais ao backend após a validação passar.

Fluxo:
  1. Vai para /login e alterna para "Criar conta".
  2. Submete vazio → há vários alerts (role="alert") e foco vai para o
     primeiro inválido (#fullName).
  3. Preenche todos os campos com valores válidos e resubmete.
  4. Verifica que:
     - activeElement é o <button type="submit"> do form.
     - Nenhum elemento com role="alert" persiste dentro do form.
     - Nenhum input do form mantém aria-invalid="true".
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots" / "field-message-all-fixed"
SHOTS.mkdir(parents=True, exist_ok=True)


async def stub_signup(context) -> None:
    async def handler(route):
        await route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"user": None, "session": None}),
        )

    await context.route("**/auth/v1/signup*", handler)


async def active_info(page) -> dict:
    return await page.evaluate(
        """() => {
          const el = document.activeElement;
          if (!el) return null;
          return { id: el.id, tag: el.tagName, type: el.getAttribute('type') };
        }"""
    )


async def form_alerts(page) -> list[str]:
    return await page.evaluate(
        """() => Array.from(document.querySelectorAll('form [role="alert"]'))
                .map((n) => (n.textContent || '').trim())
                .filter(Boolean)"""
    )


async def invalid_inputs(page) -> list[str]:
    return await page.evaluate(
        """() => Array.from(document.querySelectorAll('form [aria-invalid="true"]'))
                .map((n) => n.id || n.getAttribute('name') || n.tagName)"""
    )


async def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        print(f"  {'✓' if cond else '✗'} {msg}")
        if not cond:
            failures.append(msg)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        await stub_signup(context)
        page = await context.new_page()
        page.on("pageerror", lambda e: print(f"[pageerror] {e}"))

        print("\n▶ 1. Abrir /login em modo 'Criar conta'")
        await page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        tab = page.get_by_role("button", name=re.compile(r"^Criar conta$", re.I)).first
        await expect(tab).to_be_visible(timeout=8000)
        await page.wait_for_timeout(800)
        await tab.click()
        await page.wait_for_selector("#fullName", timeout=5000)
        await page.screenshot(path=str(SHOTS / "1_signup_open.png"))

        print("\n▶ 2. Submeter vazio → alerts presentes, foco no primeiro inválido")
        # Desativa validação HTML5 para acionar somente a lógica custom
        # (senão o browser bloqueia o submit dos campos required).
        await page.evaluate(
            "() => { const f = document.querySelector('form'); if (f) f.noValidate = true; }"
        )
        submit = page.locator('form button[type="submit"]')
        await submit.click()
        await page.wait_for_timeout(250)

        alerts_empty = await form_alerts(page)
        check(len(alerts_empty) >= 2, f"há múltiplos role='alert' após submit vazio (achado: {alerts_empty})")
        info = await active_info(page)
        check(info and info.get("id") == "fullName", f"foco inicial em #fullName (atual={info})")
        await page.screenshot(path=str(SHOTS / "2_empty_submit.png"))

        print("\n▶ 3. Corrigir todos os campos e resubmeter")
        await page.locator("#fullName").fill("Fulana da Silva")
        await page.locator("#email").fill("fulana@empresa.com")
        await page.locator("#password").fill("segredo123")
        await submit.click()
        await page.wait_for_timeout(200)

        print("\n▶ 4. Foco no submit e nenhum alert persistente")
        info = await active_info(page)
        check(
            bool(info) and info.get("tag") == "BUTTON" and info.get("type") == "submit",
            f"activeElement é o botão submit (atual={info})",
        )

        remaining_alerts = await form_alerts(page)
        check(
            remaining_alerts == [],
            f"nenhum role='alert' remanescente no form (achado: {remaining_alerts})",
        )

        remaining_invalid = await invalid_inputs(page)
        check(
            remaining_invalid == [],
            f"nenhum campo mantém aria-invalid='true' (achado: {remaining_invalid})",
        )
        await page.screenshot(path=str(SHOTS / "3_all_fixed.png"))

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
