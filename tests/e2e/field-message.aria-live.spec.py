"""
E2E · FieldMessage(role="alert") anuncia mudanças ao leitor de tela.

Verifica dois contratos:
  1. aria-live implícito correto — role="alert" mapeia para aria-live
     "assertive" e aria-atomic "true" no accessibility tree. Nenhum
     aria-live="polite" concorrente deve estar aplicado no mesmo nó.
  2. Mudanças de conteúdo são anunciadas — quando o usuário corrige um
     campo e reenvia com outro erro, o alert do campo passa a expor a
     NOVA mensagem (não a antiga), permitindo que o leitor de tela
     reanuncie o texto atualizado.

Cenário: /login em modo "Entrar". Submete vazio (mensagem "Informe o
e-mail corporativo."), depois preenche um e-mail malformado e resubmete
(mensagem muda para "E-mail inválido.").
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots" / "field-message-live"
SHOTS.mkdir(parents=True, exist_ok=True)


async def stub_auth(context) -> None:
    async def handler(route):
        await route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"user": None, "session": None}),
        )

    await context.route("**/auth/v1/**", handler)


async def alert_snapshot(page, control_id: str) -> dict:
    """Extrai o alert vinculado ao campo + suas propriedades aria."""
    return await page.evaluate(
        """(id) => {
          const ctrl = document.getElementById(id);
          if (!ctrl) return null;
          const describedby = ctrl.getAttribute('aria-describedby') || '';
          for (const token of describedby.split(/\\s+/).filter(Boolean)) {
            const node = document.getElementById(token);
            if (!node) continue;
            if (node.getAttribute('role') !== 'alert') continue;
            const cs = getComputedStyle(node);
            return {
              id: node.id,
              text: (node.textContent || '').trim(),
              role: node.getAttribute('role'),
              ariaLive: node.getAttribute('aria-live'),
              ariaAtomic: node.getAttribute('aria-atomic'),
              ariaHidden: node.getAttribute('aria-hidden'),
              visible: cs.display !== 'none' && cs.visibility !== 'hidden',
            };
          }
          return null;
        }""",
        control_id,
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
        await stub_auth(context)
        page = await context.new_page()
        page.on("pageerror", lambda e: print(f"[pageerror] {e}"))

        # ------------------------------------------------------------
        # 1. Ir para /login em modo "Entrar" e desativar validação HTML5
        # ------------------------------------------------------------
        print("\n▶ 1. Abrir /login em modo 'Entrar'")
        await page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        await expect(page.locator("#email")).to_be_visible(timeout=8000)
        await page.wait_for_timeout(600)
        await page.evaluate(
            "() => { const f = document.querySelector('form'); if (f) f.noValidate = true; }"
        )
        await page.screenshot(path=str(SHOTS / "1_login.png"))

        async def force_submit():
            # Usa requestSubmit para garantir que o handler custom sempre
            # rode, mesmo com HMR/StrictMode em execução no dev server.
            await page.evaluate(
                """() => {
                  const f = document.querySelector('form');
                  const btn = f.querySelector('button[type="submit"]');
                  f.requestSubmit(btn);
                }"""
            )

        # ------------------------------------------------------------
        # 2. Submit vazio → alert do #email com a primeira mensagem
        # ------------------------------------------------------------
        print("\n▶ 2. Submit vazio expõe alert com aria-live assertive")
        await submit.click()
        await page.wait_for_timeout(250)

        snap1 = await alert_snapshot(page, "email")
        check(snap1 is not None, f"alert encontrado via aria-describedby (snap={snap1})")
        if snap1:
            check(snap1["role"] == "alert", f"role='alert' presente ({snap1['role']})")
            # role="alert" mapeia implicitamente para aria-live="assertive" e
            # aria-atomic="true". Não deve haver aria-live="polite" aplicado
            # no mesmo nó, pois isso silenciaria a assertividade.
            check(
                snap1["ariaLive"] in (None, "assertive"),
                f"aria-live compatível com role='alert' (achado: {snap1['ariaLive']})",
            )
            check(
                snap1["ariaLive"] != "polite",
                "aria-live='polite' NÃO sobrescreve o role='alert'",
            )
            check(
                snap1["ariaAtomic"] in (None, "true"),
                f"aria-atomic compatível com role='alert' (achado: {snap1['ariaAtomic']})",
            )
            check(
                snap1["ariaHidden"] != "true",
                "alert NÃO está aria-hidden (seria removido da árvore de acessibilidade)",
            )
            check(snap1["visible"], "alert renderizado (não display:none/hidden)")
            check(
                "Informe o e-mail corporativo" in snap1["text"],
                f"texto inicial correto (achado: {snap1['text']!r})",
            )
        await page.screenshot(path=str(SHOTS / "2_empty_alert.png"))

        # ------------------------------------------------------------
        # 3. Preencher e-mail malformado + senha curta → alerts mudam
        # ------------------------------------------------------------
        print("\n▶ 3. Após correção parcial, alerts anunciam a NOVA mensagem")
        await page.locator("#email").fill("nao-eh-email")
        await page.locator("#password").fill("123")
        await submit.click()
        await page.wait_for_timeout(250)

        snap2 = await alert_snapshot(page, "email")
        check(snap2 is not None, f"alert do #email continua vinculado (snap={snap2})")
        if snap2:
            check(
                "E-mail inválido" in snap2["text"],
                f"mensagem do #email ATUALIZADA (achado: {snap2['text']!r})",
            )
            check(
                snap2["text"] != (snap1["text"] if snap1 else ""),
                "texto do alert mudou → leitor de tela reanuncia a nova mensagem",
            )
            check(snap2["role"] == "alert", "role='alert' mantido após rerender")
            check(
                snap2["ariaLive"] != "polite",
                "aria-live continua assertive após atualização",
            )

        snap_pwd = await alert_snapshot(page, "password")
        check(snap_pwd is not None, f"alert do #password presente (snap={snap_pwd})")
        if snap_pwd:
            check(
                "ao menos 6 caracteres" in snap_pwd["text"],
                f"mensagem do #password correta (achado: {snap_pwd['text']!r})",
            )
            check(snap_pwd["role"] == "alert", "#password também usa role='alert'")
        await page.screenshot(path=str(SHOTS / "3_updated_alert.png"))

        # ------------------------------------------------------------
        # 4. Corrigir tudo → alerts removidos do a11y tree do campo
        # ------------------------------------------------------------
        print("\n▶ 4. Corrigir todos os campos remove os alerts")
        await page.locator("#email").fill("fulana@empresa.com")
        await page.locator("#password").fill("segredo123")
        await submit.click()
        await page.wait_for_timeout(300)

        snap3 = await alert_snapshot(page, "email")
        check(snap3 is None, f"alert do #email desvinculado após correção (snap={snap3})")
        snap4 = await alert_snapshot(page, "password")
        check(snap4 is None, f"alert do #password desvinculado após correção (snap={snap4})")
        await page.screenshot(path=str(SHOTS / "4_cleared.png"))

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
