// Onda 124 — leitura de molde DXF (AAMA/ASTM D6673 e DXF genérico) sem dependências.
// Objetivo operacional: listar peças, área e perímetro e estimar consumo de tecido
// a partir do arquivo que a modelagem já exporta do Audaces/Lectra/Gerber/CLO.

export type PecaMolde = {
  nome: string;
  tamanho?: string;
  quantidade: number;
  layer: string;
  areaCm2: number;
  perimetroCm: number;
  larguraCm: number;
  alturaCm: number;
};

export type MoldeDxf = {
  arquivo?: string;
  importadoEm: string;
  unidade: "mm" | "cm" | "in";
  unidadeDeclarada: boolean;
  pecas: PecaMolde[];
  avisos: string[];
};

type Par = { code: number; value: string };
type Ponto = [number, number];

function lerPares(texto: string): Par[] {
  const linhas = texto.split(/\r\n|\n|\r/);
  const out: Par[] = [];
  for (let i = 0; i + 1 < linhas.length; i += 2) {
    const code = Number(linhas[i]!.trim());
    if (!Number.isFinite(code)) continue;
    out.push({ code, value: linhas[i + 1]!.trim() });
  }
  return out;
}

export function areaShoelace(p: Ponto[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]!;
    const [x2, y2] = p[(i + 1) % p.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function perimetro(p: Ponto[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]!;
    const [x2, y2] = p[(i + 1) % p.length]!;
    s += Math.hypot(x2 - x1, y2 - y1);
  }
  return s;
}

const FATOR_CM: Record<MoldeDxf["unidade"], number> = { mm: 0.1, cm: 1, in: 2.54 };

type Bloco = { nome: string; poligonos: { layer: string; pts: Ponto[] }[]; textos: string[] };

function extrairBlocos(pares: Par[]): {
  blocos: Bloco[];
  entidadesSoltas: Bloco;
  insUnits: number | null;
} {
  const blocos: Bloco[] = [];
  const soltas: Bloco = { nome: "", poligonos: [], textos: [] };
  let insUnits: number | null = null;
  let secao = "";
  let atual: Bloco | null = null;
  let i = 0;
  const alvo = () => atual ?? soltas;

  while (i < pares.length) {
    const p = pares[i]!;
    if (p.code === 0 && p.value === "SECTION") {
      secao = pares[i + 1]?.code === 2 ? pares[i + 1]!.value : "";
      i += 2;
      continue;
    }
    if (p.code === 9 && p.value === "$INSUNITS") {
      const v = pares[i + 1];
      if (v && v.code === 70) insUnits = Number(v.value);
      i += 2;
      continue;
    }
    if (p.code === 0 && p.value === "BLOCK") {
      const b: Bloco = { nome: "", poligonos: [], textos: [] };
      let j = i + 1;
      while (j < pares.length && pares[j]!.code !== 0) {
        if (pares[j]!.code === 2 && !b.nome) b.nome = pares[j]!.value;
        j++;
      }
      atual = b;
      blocos.push(b);
      i = j;
      continue;
    }
    if (p.code === 0 && p.value === "ENDBLK") {
      atual = null;
      i++;
      continue;
    }
    if (p.code === 0 && p.value === "LWPOLYLINE" && (secao === "BLOCKS" || secao === "ENTITIES")) {
      let j = i + 1;
      let layer = "0";
      let fechado = false;
      const pts: Ponto[] = [];
      let x: number | null = null;
      while (j < pares.length && pares[j]!.code !== 0) {
        const q = pares[j]!;
        if (q.code === 8) layer = q.value;
        else if (q.code === 70) fechado = (Number(q.value) & 1) === 1;
        else if (q.code === 10) x = Number(q.value);
        else if (q.code === 20 && x != null) {
          pts.push([x, Number(q.value)]);
          x = null;
        }
        j++;
      }
      if (pts.length >= 3 && (fechado || quaseFechado(pts))) alvo().poligonos.push({ layer, pts });
      i = j;
      continue;
    }
    if (p.code === 0 && p.value === "POLYLINE" && (secao === "BLOCKS" || secao === "ENTITIES")) {
      let j = i + 1;
      let layer = "0";
      let fechado = false;
      while (j < pares.length && pares[j]!.code !== 0) {
        const q = pares[j]!;
        if (q.code === 8) layer = q.value;
        else if (q.code === 70) fechado = (Number(q.value) & 1) === 1;
        j++;
      }
      const pts: Ponto[] = [];
      while (j < pares.length && !(pares[j]!.code === 0 && pares[j]!.value === "SEQEND")) {
        if (pares[j]!.code === 0 && pares[j]!.value === "VERTEX") {
          let k = j + 1;
          let vx: number | null = null;
          let vy: number | null = null;
          while (k < pares.length && pares[k]!.code !== 0) {
            if (pares[k]!.code === 10) vx = Number(pares[k]!.value);
            if (pares[k]!.code === 20) vy = Number(pares[k]!.value);
            k++;
          }
          if (vx != null && vy != null) pts.push([vx, vy]);
          j = k;
          continue;
        }
        j++;
      }
      if (pts.length >= 3 && (fechado || quaseFechado(pts))) alvo().poligonos.push({ layer, pts });
      i = j + 1;
      continue;
    }
    if (
      p.code === 0 &&
      (p.value === "TEXT" || p.value === "MTEXT") &&
      (secao === "BLOCKS" || secao === "ENTITIES")
    ) {
      let j = i + 1;
      while (j < pares.length && pares[j]!.code !== 0) {
        if (pares[j]!.code === 1 || pares[j]!.code === 3) alvo().textos.push(pares[j]!.value);
        j++;
      }
      i = j;
      continue;
    }
    i++;
  }
  return { blocos, entidadesSoltas: soltas, insUnits };
}

function quaseFechado(pts: Ponto[]): boolean {
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

const ler = (textos: string[], chave: RegExp): string | undefined => {
  for (const t of textos) {
    const m = t.match(chave);
    if (m) return m[1]!.trim();
  }
  return undefined;
};

function unidadePorInsUnits(v: number | null): MoldeDxf["unidade"] | null {
  if (v === 1) return "in";
  if (v === 4) return "mm";
  if (v === 5) return "cm";
  return null;
}

export function parseDxfMolde(
  texto: string,
  arquivo?: string,
  unidadeForcada?: MoldeDxf["unidade"],
): MoldeDxf {
  const avisos: string[] = [];
  const pares = lerPares(texto);
  const { blocos, entidadesSoltas, insUnits } = extrairBlocos(pares);

  // Fonte das peças: blocos com polígono (AAMA) ou, na falta, polígonos soltos.
  const fontes: Bloco[] = blocos.filter((b) => b.poligonos.length > 0);
  if (fontes.length === 0 && entidadesSoltas.poligonos.length > 0) {
    entidadesSoltas.poligonos.forEach((pg, idx) =>
      fontes.push({ nome: `Peça ${idx + 1}`, poligonos: [pg], textos: entidadesSoltas.textos }),
    );
    avisos.push("DXF sem blocos AAMA: cada contorno fechado foi tratado como uma peça.");
  }
  if (fontes.length === 0) {
    return {
      arquivo,
      importadoEm: new Date().toISOString(),
      unidade: unidadeForcada ?? "cm",
      unidadeDeclarada: false,
      pecas: [],
      avisos: [
        "Nenhum contorno fechado encontrado. Exporte o molde como DXF-AAMA/ASTM (polilinhas fechadas).",
      ],
    };
  }

  // Unidade
  let unidade: MoldeDxf["unidade"];
  let unidadeDeclarada = false;
  if (unidadeForcada) unidade = unidadeForcada;
  else {
    const u = unidadePorInsUnits(insUnits);
    if (u) {
      unidade = u;
      unidadeDeclarada = true;
    } else {
      let maior = 0;
      for (const f of fontes)
        for (const pg of f.poligonos)
          for (const [x, y] of pg.pts) maior = Math.max(maior, Math.abs(x), Math.abs(y));
      unidade = maior > 1000 ? "mm" : maior < 120 ? "in" : "cm";
      avisos.push(
        `Unidade não declarada no DXF ($INSUNITS); assumi ${unidade} pelo tamanho das coordenadas — confira e ajuste se preciso.`,
      );
    }
  }
  const k = FATOR_CM[unidade];

  const pecas: PecaMolde[] = fontes.map((b, idx) => {
    // contorno principal = maior polígono (demais são piques/furos/costura interna); prioriza layer 1 (AAMA = boundary)
    const candidatos = b.poligonos.filter((p) => p.layer === "1");
    const lista = candidatos.length ? candidatos : b.poligonos;
    const principal = lista.reduce(
      (m, p) => (areaShoelace(p.pts) > areaShoelace(m.pts) ? p : m),
      lista[0]!,
    );
    const xs = principal.pts.map((p) => p[0]);
    const ys = principal.pts.map((p) => p[1]);
    const nome = ler(b.textos, /PIECE\s*NAME\s*:\s*(.+)/i) ?? (b.nome || `Peça ${idx + 1}`);
    const tamanho = ler(b.textos, /\bSIZE\s*:\s*(.+)/i);
    const qtd = Number(ler(b.textos, /QUANTITY\s*:\s*(\d+)/i) ?? 1) || 1;
    return {
      nome,
      tamanho,
      quantidade: qtd,
      layer: principal.layer,
      areaCm2: Math.round(areaShoelace(principal.pts) * k * k * 100) / 100,
      perimetroCm: Math.round(perimetro(principal.pts) * k * 100) / 100,
      larguraCm: Math.round((Math.max(...xs) - Math.min(...xs)) * k * 100) / 100,
      alturaCm: Math.round((Math.max(...ys) - Math.min(...ys)) * k * 100) / 100,
    };
  });

  return {
    arquivo,
    importadoEm: new Date().toISOString(),
    unidade,
    unidadeDeclarada,
    pecas,
    avisos,
  };
}

/** Consumo linear estimado (m por peça de roupa) para um tamanho: Σ(área × qtd) ÷ (largura útil × aproveitamento). */
export function estimarConsumoMetros(
  pecas: PecaMolde[],
  larguraCm: number,
  eficienciaPct: number,
  tamanho?: string,
): { metros: number; areaCm2: number; pecasConsideradas: number } {
  const sel = tamanho
    ? pecas.filter((p) => !p.tamanho || p.tamanho.toUpperCase() === tamanho.toUpperCase())
    : pecas;
  const area = sel.reduce((a, p) => a + p.areaCm2 * p.quantidade, 0);
  const ef = Math.min(100, Math.max(1, eficienciaPct || 85)) / 100;
  if (larguraCm <= 0 || area <= 0)
    return { metros: 0, areaCm2: area, pecasConsideradas: sel.length };
  const metros = area / (larguraCm * ef) / 100;
  return {
    metros: Math.round(metros * 1000) / 1000,
    areaCm2: Math.round(area),
    pecasConsideradas: sel.length,
  };
}

export function tamanhosDoMolde(pecas: PecaMolde[]): string[] {
  return [...new Set(pecas.map((p) => p.tamanho).filter((t): t is string => Boolean(t)))];
}
