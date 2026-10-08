#!/usr/bin/env node
// Relatório de segurança automatizado: auditoria de dependências + análise estática.
//
// Substitui a versão anterior, que estava QUEBRADA: ela referenciava a variável
// `auditOutput` sem nunca defini-la, então o try lançava ReferenceError, o catch
// imprimia `error.stdout` (undefined) e o relatório saía com a auditoria vazia —
// ou seja, a varredura nunca auditou nada de fato.
//
// Uso:  node scripts/security-report.js   (ou npm run security-scan)
// Saída: security-report.md na raiz. O arquivo é artefato gerado: não commitar
// (já coberto pelo .gitignore).

import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const LINHA = (t) => `\n## ${t}\n`;

function run(cmd) {
  try {
    const stdout = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout };
  } catch (error) {
    // Comando com exit code != 0 (ex.: audit encontrou vulnerabilidades) ainda
    // produz saída útil em stdout/stderr — preservamos as duas.
    return {
      ok: false,
      stdout: (error.stdout ?? "").toString(),
      stderr: (error.stderr ?? "").toString(),
    };
  }
}

function bloco(conteudo) {
  return "```\n" + (conteudo.trim() || "(sem saída)") + "\n```\n";
}

const partes = [];
partes.push("# Relatório de Segurança Automatizado\n");
partes.push(`Data: ${new Date().toISOString()}\n`);
partes.push(
  "\n> Artefato gerado por `scripts/security-report.js`. Não versionar.\n" +
    "> Este relatório cobre dependências e lint. Ele **não** substitui revisão de RLS,\n" +
    "> políticas de storage nem auditoria dos endpoints `/api/public/*`.\n",
);

// ─── 1. Auditoria de dependências ────────────────────────────────────────────
partes.push(LINHA("Auditoria de dependências"));
const temBun = run("bun --version").ok;
const audit = temBun ? run("bun audit") : run("npm audit --omit=dev --audit-level=low");

partes.push(
  `Gerenciador detectado: **${temBun ? "bun" : "npm"}**.\n\n` +
    (audit.ok
      ? "Nenhuma vulnerabilidade reportada.\n"
      : "Vulnerabilidades encontradas (exit code != 0):\n"),
);
partes.push(bloco([audit.stdout, audit.stderr].filter(Boolean).join("\n")));

// ─── 2. Análise estática ─────────────────────────────────────────────────────
partes.push(LINHA("Análise estática (eslint)"));
const lint = run("npx eslint . --no-color");
partes.push(lint.ok ? "Nenhum problema encontrado.\n" : "Problemas encontrados:\n");
partes.push(bloco([lint.stdout, lint.stderr].filter(Boolean).join("\n")));

// ─── 3. Checagem de tipos ────────────────────────────────────────────────────
partes.push(LINHA("Checagem de tipos (tsc)"));
const tsc = run("npx tsc --noEmit");
partes.push(tsc.ok ? "Sem erros de tipo.\n" : "Erros de tipo encontrados:\n");
partes.push(bloco([tsc.stdout, tsc.stderr].filter(Boolean).join("\n")));

// ─── 4. Guardas de configuração ──────────────────────────────────────────────
partes.push(LINHA("Guardas de configuração"));
const guardas = [];
if (existsSync(".env")) {
  guardas.push(
    "- ⚠️  `.env` existe no diretório. Confirme que **não** está versionado: `git ls-files .env`",
  );
} else {
  guardas.push("- ✅ Nenhum `.env` no diretório de trabalho.");
}
guardas.push(
  existsSync(".env.example")
    ? "- ✅ `.env.example` presente como template."
    : "- ⚠️  `.env.example` ausente — onboarding vai depender de documentação oral.",
);
partes.push(guardas.join("\n") + "\n");

const destino = "security-report.md";
writeFileSync(destino, partes.join(""), "utf8");
console.log(`--- Relatório concluído: ${destino} ---`);
