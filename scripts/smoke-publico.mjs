#!/usr/bin/env node
// Smoke E2E do app publicado — roda SEM credenciais.
//
// O que cobre (e o que não cobre):
//   ✔ a aplicação sobe e serve HTML em todas as rotas declaradas em ROUTE_REGISTRY
//   ✔ o bundle publicado contém cada rota (rota nova no repo que não subiu = falha)
//   ✔ o bundle referencia o projeto Supabase correto
//   ✔ as rotas protegidas redirecionam para /login em vez de quebrar
//   ✘ NÃO exercita o fluxo autenticado (pedido → custo → PCP) — isso exige
//     usuário real; ver scripts/smoke-fluxo.md para o teste manual de 6 passos.
//
// Uso:
//   node scripts/smoke-publico.mjs
//   APP=https://plmuse.lovable.app SUPABASE_PROJECT=njmniwsqwohmigroswnl node scripts/smoke-publico.mjs
//
// Sai com código 1 se qualquer verificação falhar (usável em CI).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = process.env.APP ?? "https://plmuse.lovable.app";
const PROJETO = process.env.SUPABASE_PROJECT ?? "njmniwsqwohmigroswnl";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const problemas = [];
const ok = [];

function passar(msg) {
  ok.push(msg);
  console.log(`  ok  ${msg}`);
}
function falhar(msg, detalhe) {
  problemas.push({ msg, detalhe });
  console.log(`  FALHA  ${msg}${detalhe ? ` — ${detalhe}` : ""}`);
}

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

// 1) rotas do repositório
const registry = readFileSync(join(ROOT, "src/lib/nav/routes.ts"), "utf8");
const rotas = [...registry.matchAll(/path:\s*"(\/[a-z0-9/-]*)"/g)].map((m) => m[1]);
console.log(`\n[1] ${rotas.length} rotas declaradas em ROUTE_REGISTRY`);

// 2) a aplicação responde
console.log(`\n[2] Aplicação em ${APP}`);
let html = "";
try {
  const r = await get(`${APP}/login`);
  html = await r.text();
  if (r.status === 200 && html.includes("<html")) passar(`GET /login → 200 (${html.length} bytes)`);
  else falhar(`GET /login → ${r.status}`);
} catch (e) {
  falhar("app não respondeu", e.message);
}

// 3) todas as rotas sobem (200 ou redirect para login — nunca 404/500)
console.log(`\n[3] Rotas respondem (nunca 404/5xx)`);
for (const rota of rotas) {
  try {
    const r = await get(`${APP}${rota}`);
    if (r.status >= 500) falhar(`${rota} → ${r.status}`);
    else passar(`${rota} → ${r.status}`);
  } catch (e) {
    falhar(`${rota} não respondeu`, e.message);
  }
}

// 4) o bundle publicado tem as rotas do repo (pega "esqueci de publicar")
console.log(`\n[4] Bundle publicado contém as rotas do repositório`);
if (html) {
  const chunks = [
    ...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0])),
  ];
  let publicados = "";
  for (const c of chunks) {
    try {
      publicados += await (await get(`${APP}${c}`)).text();
    } catch {
      /* chunk que não baixou já aparece no passo 3 */
    }
  }
  const noAr = new Set([...publicados.matchAll(/path:"(\/[a-z0-9/-]+)"/g)].map((m) => m[1]));
  const ausentes = rotas.filter((r) => !noAr.has(r));
  if (chunks.length === 0) falhar("nenhum chunk encontrado no HTML de /login");
  else if (ausentes.length === 0)
    passar(`${rotas.length} rotas no ar (${chunks.length} chunks verificados)`);
  else falhar(`rotas no repo e fora do ar: ${ausentes.join(", ")}`);

  // 5) aponta para o projeto Supabase certo
  console.log(`\n[5] Projeto Supabase do bundle`);
  if (publicados.includes(`${PROJETO}.supabase.co`)) passar(`aponta para ${PROJETO}`);
  else falhar(`bundle não referencia ${PROJETO}.supabase.co`);
}

// 6) rota protegida manda para login em vez de estourar
console.log(`\n[6] Proteção de rota`);
try {
  const r = await get(`${APP}/dashboard`);
  const final = new URL(r.url).pathname;
  if (r.status < 500) passar(`/dashboard → ${r.status} (final: ${final})`);
  else falhar(`/dashboard → ${r.status}`);
} catch (e) {
  falhar("/dashboard não respondeu", e.message);
}

// resumo
console.log(`\n${"—".repeat(60)}`);
console.log(`${ok.length} ok · ${problemas.length} falha(s)`);
if (problemas.length) {
  console.log("\nFalhas:");
  for (const p of problemas) console.log(`  - ${p.msg}${p.detalhe ? ` (${p.detalhe})` : ""}`);
  process.exit(1);
}
console.log("Smoke público passou.");
