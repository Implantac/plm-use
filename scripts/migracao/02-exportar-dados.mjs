#!/usr/bin/env node
// Onda 126 — exporta TODOS os dados do PLM antigo (Lovable Cloud) usando só o seu login de admin.
// Não precisa de service role nem de acesso ao painel: entra pelo GoTrue com e-mail/senha e lê
// cada tabela pelo PostgREST com o seu JWT (o RLS de admin enxerga tudo). Também baixa os
// arquivos dos buckets privados (use-moda-assets, official-models).
//
// Uso (Node 18+):
//   PLM_URL=https://njmniwsqwohmigroswnl.supabase.co \
//   PLM_ANON=sb_publishable_... \
//   PLM_EMAIL=voce@empresa.com PLM_SENHA='...' \
//   node scripts/migracao/02-exportar-dados.mjs ./backup
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const { PLM_URL, PLM_ANON, PLM_EMAIL, PLM_SENHA } = process.env;
if (!PLM_URL || !PLM_ANON || !PLM_EMAIL || !PLM_SENHA) {
  console.error("Defina PLM_URL, PLM_ANON, PLM_EMAIL e PLM_SENHA.");
  process.exit(1);
}
const destino = process.argv[2] ?? "./backup";
await mkdir(path.join(destino, "arquivos"), { recursive: true });
const tabelas = JSON.parse(await readFile(new URL("./tabelas.json", import.meta.url), "utf8"));

// 1) login
const login = await fetch(`${PLM_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: PLM_ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: PLM_EMAIL, password: PLM_SENHA }),
});
if (!login.ok) {
  console.error("Login falhou:", login.status, await login.text());
  process.exit(1);
}
const sess = await login.json();
const H = { apikey: PLM_ANON, Authorization: `Bearer ${sess.access_token}` };
console.log(`Logado como ${sess.user?.email} (id ${sess.user?.id}).`);

// 2) tabelas, paginadas de 1000 em 1000
const resumo = {};
for (const t of tabelas) {
  const linhas = [];
  let de = 0;
  let erro = null;
  for (;;) {
    const r = await fetch(`${PLM_URL}/rest/v1/${t}?select=*`, {
      headers: { ...H, Range: `${de}-${de + 999}`, Prefer: "count=exact" },
    });
    if (r.status === 404 || r.status === 400) {
      erro = `tabela não existe no projeto antigo (${r.status})`;
      break;
    }
    if (!r.ok && r.status !== 206 && r.status !== 416) {
      erro = `${r.status} ${await r.text()}`;
      break;
    }
    if (r.status === 416) break;
    const lote = await r.json();
    linhas.push(...lote);
    if (lote.length < 1000) break;
    de += 1000;
  }
  if (erro) {
    resumo[t] = { erro };
    console.log(`  ${t}: ${erro}`);
    continue;
  }
  await writeFile(path.join(destino, `${t}.json`), JSON.stringify(linhas));
  resumo[t] = { linhas: linhas.length };
  console.log(`  ${t}: ${linhas.length}`);
}

// 3) usuários referenciados (para o mapa old_id → new_id do passo 03)
const perfis = existsSync(path.join(destino, "profiles.json"))
  ? JSON.parse(await readFile(path.join(destino, "profiles.json"), "utf8"))
  : [];
const papeis = existsSync(path.join(destino, "user_roles.json"))
  ? JSON.parse(await readFile(path.join(destino, "user_roles.json"), "utf8"))
  : [];
const usuarios = perfis.map((p) => ({
  old_id: p.id,
  full_name: p.full_name,
  roles: papeis.filter((r) => r.user_id === p.id).map((r) => r.role),
  email: p.id === sess.user?.id ? sess.user.email : "",
  new_id: p.id === sess.user?.id ? "" : "",
}));
await writeFile(
  path.join(destino, "usuarios-map.json"),
  JSON.stringify({ "*": "", usuarios }, null, 2),
);

// 4) arquivos dos buckets
async function listar(bucket, prefix = "") {
  const r = await fetch(`${PLM_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!r.ok) return [];
  const itens = await r.json();
  const out = [];
  for (const it of itens) {
    const p = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.id) out.push(p);
    else out.push(...(await listar(bucket, p)));
  }
  return out;
}
let arquivos = 0;
for (const bucket of ["use-moda-assets", "official-models"]) {
  const lista = await listar(bucket);
  for (const p of lista) {
    const r = await fetch(`${PLM_URL}/storage/v1/object/${bucket}/${p}`, { headers: H });
    if (!r.ok) continue;
    const alvo = path.join(destino, "arquivos", bucket, p);
    await mkdir(path.dirname(alvo), { recursive: true });
    await writeFile(alvo, Buffer.from(await r.arrayBuffer()));
    arquivos++;
  }
  console.log(`  bucket ${bucket}: ${lista.length} arquivos`);
}
await writeFile(
  path.join(destino, "RESUMO.json"),
  JSON.stringify(
    { exportado_em: new Date().toISOString(), origem: PLM_URL, tabelas: resumo, arquivos },
    null,
    2,
  ),
);
console.log(
  `\nPronto: ${destino}/ — ${Object.values(resumo).reduce((a, r) => a + (r.linhas ?? 0), 0)} linhas, ${arquivos} arquivos.`,
);
console.log(
  "Próximo passo: preencha usuarios-map.json (new_id de cada pessoa no Supabase novo) e rode 03-importar-dados.mjs.",
);
