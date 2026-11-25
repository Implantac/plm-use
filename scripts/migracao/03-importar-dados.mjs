#!/usr/bin/env node
// Onda 126 — importa o backup do passo 02 no Supabase NOVO (service role, PostgREST).
// Remapeia ids de usuário (usuarios-map.json), faz upsert por tabela na ordem de dependência e
// repete passes até não haver progresso (FKs entre tabelas). Sobe os arquivos dos buckets.
//
// Uso:
//   NOVO_URL=https://<ref>.supabase.co NOVO_SERVICE_ROLE=eyJ... node scripts/migracao/03-importar-dados.mjs ./backup
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const { NOVO_URL, NOVO_SERVICE_ROLE } = process.env;
if (!NOVO_URL || !NOVO_SERVICE_ROLE) {
  console.error("Defina NOVO_URL e NOVO_SERVICE_ROLE (Project Settings → API → service_role).");
  process.exit(1);
}
const origem = process.argv[2] ?? "./backup";
const tabelas = JSON.parse(await readFile(new URL("./tabelas.json", import.meta.url), "utf8"));
const H = {
  apikey: NOVO_SERVICE_ROLE,
  Authorization: `Bearer ${NOVO_SERVICE_ROLE}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

// mapa de usuários
const mapaArq = path.join(origem, "usuarios-map.json");
const mapa = existsSync(mapaArq)
  ? JSON.parse(await readFile(mapaArq, "utf8"))
  : { "*": "", usuarios: [] };
const troca = new Map();
for (const u of mapa.usuarios ?? []) if (u.new_id) troca.set(u.old_id, u.new_id);
const fallback = mapa["*"] || null;
const idsAntigos = new Set((mapa.usuarios ?? []).map((u) => u.old_id));
const remap = (v) => {
  if (typeof v === "string" && idsAntigos.has(v)) return troca.get(v) ?? fallback ?? v;
  if (Array.isArray(v)) return v.map(remap);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x)]));
  return v;
};
// profiles/user_roles: a linha inteira é o usuário — só importa se mapeado
const sóMapeados = new Set(["profiles", "user_roles", "tenant_memberships", "supplier_users"]);

const pendentes = new Map();
for (const t of tabelas) {
  const arq = path.join(origem, `${t}.json`);
  if (!existsSync(arq)) continue;
  let linhas = JSON.parse(await readFile(arq, "utf8")).map(remap);
  if (sóMapeados.has(t))
    linhas = linhas.filter((l) => {
      const id = l.user_id ?? l.id;
      return !idsAntigos.has(id) || troca.has(id);
    });
  if (linhas.length) pendentes.set(t, linhas);
}

async function enviar(t, lote) {
  const r = await fetch(`${NOVO_URL}/rest/v1/${t}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(lote),
  });
  return r.ok ? null : `${r.status} ${(await r.text()).slice(0, 200)}`;
}
const falhas = {};
for (let passe = 1; passe <= 6 && pendentes.size; passe++) {
  let progresso = 0;
  console.log(`== passe ${passe}: ${pendentes.size} tabela(s) pendente(s)`);
  for (const [t, linhas] of [...pendentes]) {
    const restantes = [];
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const e = await enviar(t, lote);
      if (!e) {
        progresso += lote.length;
        continue;
      }
      // em lote falhou: tenta linha a linha para isolar as que dependem de FK ainda ausente
      for (const l of lote) {
        const e1 = await enviar(t, [l]);
        if (e1) {
          restantes.push(l);
          falhas[t] = e1;
        } else progresso++;
      }
    }
    if (restantes.length) pendentes.set(t, restantes);
    else {
      pendentes.delete(t);
      delete falhas[t];
    }
    console.log(`  ${t}: ${linhas.length - restantes.length} ok, ${restantes.length} pendentes`);
  }
  if (!progresso) break;
}
for (const [t, linhas] of pendentes)
  console.log(`FALTOU ${t}: ${linhas.length} linha(s) — último erro: ${falhas[t]}`);

// arquivos
const raiz = path.join(origem, "arquivos");
let enviados = 0;
async function subir(dir, bucket, prefixo = "") {
  for (const nome of await readdir(dir)) {
    const p = path.join(dir, nome);
    const rel = prefixo ? `${prefixo}/${nome}` : nome;
    if ((await stat(p)).isDirectory()) await subir(p, bucket, rel);
    else {
      const r = await fetch(`${NOVO_URL}/storage/v1/object/${bucket}/${rel}`, {
        method: "POST",
        headers: {
          apikey: NOVO_SERVICE_ROLE,
          Authorization: `Bearer ${NOVO_SERVICE_ROLE}`,
          "x-upsert": "true",
        },
        body: await readFile(p),
      });
      if (r.ok) enviados++;
      else console.log(`  arquivo ${bucket}/${rel}: ${r.status}`);
    }
  }
}
if (existsSync(raiz))
  for (const bucket of await readdir(raiz)) await subir(path.join(raiz, bucket), bucket);
console.log(
  `\nImportação concluída. Arquivos enviados: ${enviados}. Tabelas pendentes: ${pendentes.size}.`,
);
