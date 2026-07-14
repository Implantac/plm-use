"""
E2E · FieldMessage acessibilidade (screen reader).

Fluxos cobertos na rota pública /login:
  1. Submit vazio  → mensagens `role="alert"` aparecem e inputs recebem
     `aria-invalid="true"` (SR anuncia imediatamente).
  2. E-mail inválido → mensagem específica é anunciada como alert e o
     campo email permanece com `aria-invalid="true"`.
  3. Senha curta → mensagem específica é anunciada como alert.
  4. Correção do valor + novo submit → alerts desaparecem e
     `aria-invalid` volta para false.

Cada asserção é acompanhada de screenshot para evidência visual.
"""

import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots" / "field-message"
SHOTS.mkdir(parents=True, exist_ok=True)
AXE_SRC = (Path(__file__).parent / "vendor" / "axe.min.js").read_text()


async def run_axe(page, label: str) -> set[tuple[str, str]]:
    """Roda axe-core no <form> e devolve fingerprint (rule, target) das
    violações. Restringe às regras WCAG 2.0/2.1 A e AA."""
    await page.evaluate(AXE_SRC)
    result = await page.evaluate(
        """async () => {
          const form = document.querySelector('form');
          const res = await window.axe.run(form, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          });
          return res.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map(n => ({ target: n.target.join(' '), failureSummary: n.failureSummary })),
          }));
        }"""
    )
    fp: set[tuple[str, str]] = set()
    for v in result:
        for n in v["nodes"]:
            fp.add((v["id"], n["target"]))
    print(f"  · axe [{label}]: {len(fp)} nó(s) com violação")
    for v in result:
        print(f"     - {v['id']} ({v['impact']}) x{len(v['nodes'])}")
        for n in v["nodes"]:
            print(f"        · {n['target']}")
    return fp


async def get_attr(locator, name: str) -> str | None:
    return await locator.get_attribute(name)


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

        # ---------------------------------------------------------------
        # 1. Submit vazio
        # ---------------------------------------------------------------
        print("\n▶ 1. Submit vazio anuncia erros via role=alert")
        await page.goto(f"{BASE}/login", wait_until="networkidle")
        await page.wait_for_selector("input#email")
        # dá tempo para o React hidratar os handlers de onSubmit
        await page.wait_for_timeout(800)

        # Contorna a validação nativa do browser para chegar no validate()
        # do formulário — que é onde FieldMessage é acionado.
        # Desativa validação HTML nativa para exercitar o validate() do form.
        await page.evaluate(
            "document.querySelectorAll('form').forEach(f => f.noValidate = true);"
            "document.querySelectorAll('input').forEach(i => i.removeAttribute('required'));"
        )

        # ---------------------------------------------------------------
        # Baseline axe · form pristino, sem nenhum erro exibido.
        # Todos os fluxos abaixo devem se manter ⊆ deste baseline
        # (ou seja, FieldMessage não pode introduzir novas violações).
        # ---------------------------------------------------------------
        baseline_axe = await run_axe(page, "baseline")

        def diff(new: set, label: str) -> None:
            added = new - baseline_axe
            if not added:
                check(True, f"axe [{label}]: nenhuma violação nova vs baseline")
                return
            for rule, target in sorted(added):
                check(False, f"axe [{label}]: nova violação {rule} em {target}")

        import re as _re
        submit = page.get_by_role(
            "button", name=_re.compile("Entrar no Sistema", _re.I)
        )
        await submit.click()

        email = page.locator("input#email")
        password = page.locator("input#password")

        # role=alert do FieldMessage(variant=error) — anunciado pelo SR.
        alerts = page.get_by_role("alert")
        await expect(alerts.first).to_be_visible(timeout=2000)

        email_alert = page.get_by_role("alert").filter(
            has_text="Informe o e-mail corporativo."
        )
        pwd_alert = page.get_by_role("alert").filter(has_text="Informe a senha.")
        await expect(email_alert).to_be_visible()
        await expect(pwd_alert).to_be_visible()
        check(True, "role=alert para email e senha renderizado")

        check(
            (await get_attr(email, "aria-invalid")) == "true",
            "email aria-invalid=true após submit vazio",
        )
        check(
            (await get_attr(password, "aria-invalid")) == "true",
            "password aria-invalid=true após submit vazio",
        )
        await page.screenshot(path=str(SHOTS / "1_empty_submit.png"))
        diff(await run_axe(page, "empty_submit"), "empty_submit")

        # ---------------------------------------------------------------
        # 2. E-mail inválido
        # ---------------------------------------------------------------
        print("\n▶ 2. E-mail inválido troca mensagem do alert")
        await email.fill("nao-e-email")
        await password.fill("123456")
        await submit.click()

        invalid_alert = page.get_by_role("alert").filter(has_text="E-mail inválido.")
        await expect(invalid_alert).to_be_visible(timeout=2000)
        check(True, "role=alert atualizado para 'E-mail inválido.'")
        check(
            (await get_attr(email, "aria-invalid")) == "true",
            "email mantém aria-invalid=true com valor inválido",
        )
        check(
            (await get_attr(password, "aria-invalid")) != "true",
            "password perde aria-invalid após preencher com valor válido",
        )
        await page.screenshot(path=str(SHOTS / "2_invalid_email.png"))
        diff(await run_axe(page, "invalid_email"), "invalid_email")

        # ---------------------------------------------------------------
        # 3. Senha curta
        # ---------------------------------------------------------------
        print("\n▶ 3. Senha curta gera alert dedicado")
        await email.fill("user@empresa.com")
        await password.fill("123")
        await submit.click()

        short_pwd = page.get_by_role("alert").filter(
            has_text="A senha precisa ter ao menos 6 caracteres."
        )
        await expect(short_pwd).to_be_visible(timeout=2000)
        check(True, "role=alert para senha < 6 caracteres")
        check(
            (await get_attr(password, "aria-invalid")) == "true",
            "password aria-invalid=true com senha curta",
        )
        check(
            (await get_attr(email, "aria-invalid")) != "true",
            "email sem aria-invalid após corrigir",
        )
        await page.screenshot(path=str(SHOTS / "3_short_password.png"))
        diff(await run_axe(page, "short_password"), "short_password")

        # ---------------------------------------------------------------
        # 4. Correção limpa alerts e aria-invalid
        # ---------------------------------------------------------------
        # Observação: os alerts atuais só são recomputados no próximo submit
        # (validate() roda no onSubmit). Validar esse comportamento explícito.
        print("\n▶ 4. Após corrigir + submit os alerts somem")
        await password.fill("senha-forte-123")
        # Impede o fetch real do Supabase capturando o request para acelerar.
        await context.route(
            "**/auth/v1/token**",
            lambda route: route.fulfill(
                status=400,
                content_type="application/json",
                body='{"error":"invalid_grant","error_description":"mock"}',
            ),
        )
        await submit.click()

        # Após validate() passar, todos os alerts de validação inline devem
        # desaparecer. Pode surgir um novo alert "form" vindo do servidor
        # (mock 400) — validamos apenas que os três de validação sumiram.
        await expect(
            page.get_by_role("alert").filter(has_text="Informe o e-mail corporativo.")
        ).to_have_count(0)
        await expect(
            page.get_by_role("alert").filter(has_text="E-mail inválido.")
        ).to_have_count(0)
        await expect(
            page.get_by_role("alert").filter(
                has_text="A senha precisa ter ao menos 6 caracteres."
            )
        ).to_have_count(0)
        check(True, "alerts de validação removidos após correção")

        check(
            (await get_attr(email, "aria-invalid")) != "true",
            "email aria-invalid limpo",
        )
        check(
            (await get_attr(password, "aria-invalid")) != "true",
            "password aria-invalid limpo",
        )
        await page.screenshot(path=str(SHOTS / "4_after_fix.png"))
        diff(await run_axe(page, "after_fix"), "after_fix")

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
