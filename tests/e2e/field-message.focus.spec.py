"""
E2E · FieldMessage focus management.

Verifica que ao submeter o formulário de /login com erros:
  1. Submit totalmente vazio (signin) → foco vai para #email (primeiro
     inválido na ordem visual) e o FieldMessage correspondente é
     referenciado via aria-describedby e possui role="alert".
  2. Email preenchido válido + senha vazia → foco vai para #password.
  3. Signup com todos vazios → foco vai para #fullName (primeiro campo).
  4. Após corrigir o primeiro campo inválido e resubmeter, foco vai
     para o próximo inválido restante.

Cada campo inválido precisa expor a mensagem para o SR:
  - aria-invalid="true" no controle
  - aria-describedby apontando para um elemento com role="alert"
    e texto visível não vazio.
"""

import asyncio
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots" / "field-message-focus"
SHOTS.mkdir(parents=True, exist_ok=True)


async def active_id(page) -> str | None:
    return await page.evaluate("() => document.activeElement && document.activeElement.id")


async def assert_field_announces(page, field_id: str, check) -> None:
    """Confirma que o input#field_id está aria-invalid e que seu
    aria-describedby aponta para um alert com texto."""
    ctrl = page.locator(f"#{field_id}")
    aria_invalid = await ctrl.get_attribute("aria-invalid")
    check(aria_invalid == "true", f"#{field_id} aria-invalid=true")

    describedby = await ctrl.get_attribute("aria-describedby")
    check(bool(describedby), f"#{field_id} tem aria-describedby")
    if not describedby:
        return

    for token in describedby.split():
        node = page.locator(f"#{token}")
        if await node.count() == 0:
            continue
        role = await node.get_attribute("role")
        text = (await node.inner_text()).strip()
        if role == "alert" and text:
            check(True, f"#{field_id} descrito por alert '{text}'")
            return
    check(False, f"#{field_id} aria-describedby não aponta para alert com texto")


async def disable_native_validation(page) -> None:
    await page.evaluate(
        "document.querySelectorAll('form').forEach(f => f.noValidate = true);"
        "document.querySelectorAll('input').forEach(i => i.removeAttribute('required'));"
    )


async def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if cond:
            print(f"  ✓ {msg}")
        else:
            print(f"  ✗ {msg}")
            failures.append(msg)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        page.on("pageerror", lambda e: print(f"[pageerror] {e}"))

        submit_re = re.compile(r"^(Entrar no Sistema|Criar Conta)$")

        # -----------------------------------------------------------
        # 1. Signin vazio → foco em #email
        # -----------------------------------------------------------
        print("\n▶ 1. Signin vazio move foco para #email")
        await page.goto(f"{BASE}/login", wait_until="networkidle")
        await page.wait_for_selector("input#email")
        await page.wait_for_timeout(500)
        await disable_native_validation(page)

        submit = page.get_by_role("button", name=submit_re)
        await submit.click()
        await page.wait_for_timeout(150)

        check((await active_id(page)) == "email", "activeElement=#email após submit vazio (signin)")
        await assert_field_announces(page, "email", check)
        await assert_field_announces(page, "password", check)
        await page.screenshot(path=str(SHOTS / "1_signin_empty.png"))

        # -----------------------------------------------------------
        # 2. Email válido + senha vazia → foco em #password
        # -----------------------------------------------------------
        print("\n▶ 2. Só senha faltando move foco para #password")
        await page.locator("#email").fill("user@empresa.com")
        await page.locator("#password").fill("")
        # move foco para outro lugar para provar que o submit move de volta
        await submit.focus()
        await submit.click()
        await page.wait_for_timeout(150)

        check((await active_id(page)) == "password", "activeElement=#password quando só senha inválida")
        await assert_field_announces(page, "password", check)
        pwd_invalid = await page.locator("#email").get_attribute("aria-invalid")
        check(pwd_invalid != "true", "#email não fica aria-invalid quando válido")
        await page.screenshot(path=str(SHOTS / "2_password_only.png"))

        # -----------------------------------------------------------
        # 3. Signup vazio → foco em #fullName
        # -----------------------------------------------------------
        print("\n▶ 3. Signup vazio move foco para #fullName")
        await page.get_by_role("button", name=re.compile("Criar conta", re.I)).click()
        await page.wait_for_selector("input#fullName")
        await disable_native_validation(page)
        await page.locator("#email").fill("")
        await page.locator("#password").fill("")

        submit_signup = page.get_by_role("button", name=re.compile(r"^Criar Conta$"))
        await submit_signup.click()
        await page.wait_for_timeout(150)

        check((await active_id(page)) == "fullName", "activeElement=#fullName após submit vazio (signup)")
        await assert_field_announces(page, "fullName", check)
        await page.screenshot(path=str(SHOTS / "3_signup_empty.png"))

        # -----------------------------------------------------------
        # 4. Corrigir primeiro campo → foco vai para o próximo inválido
        # -----------------------------------------------------------
        print("\n▶ 4. Após corrigir #fullName, foco vai para #email")
        await page.locator("#fullName").fill("Fulano de Tal")
        await submit_signup.focus()
        await submit_signup.click()
        await page.wait_for_timeout(150)

        check((await active_id(page)) == "email", "activeElement=#email após corrigir #fullName")
        await assert_field_announces(page, "email", check)
        await page.screenshot(path=str(SHOTS / "4_after_fix_first.png"))

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
