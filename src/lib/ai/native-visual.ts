// Visual nativo do AI Product Studio: desenha a peça localmente (SVG → PNG
// transparente) a partir da proposta, sem chamar o provedor de IA.
type Input = { family?: string; category?: string; name?: string; color?: string; view?: string };

const COLORS: Record<string, string> = {
  preto: "#1f1b18", branco: "#f7f5f0", "off-white": "#efe9dc", areia: "#d8c6a5", bege: "#d9c4a3",
  azul: "#3e5f8a", marinho: "#1f2e4a", verde: "#4f7a55", oliva: "#6b6b3a", vermelho: "#a83232",
  rosa: "#d99aa5", cinza: "#8a8a8a", caramelo: "#b07a45", laranja: "#d9823b", terracota: "#b5603e",
};

function hex(color = "") {
  const c = color.toLowerCase();
  const key = Object.keys(COLORS).find((k) => c.includes(k));
  return key ? COLORS[key] : "#c9b8a0";
}

function shade(h: string, f: number) {
  const n = parseInt(h.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function shape(kind: string, back: boolean, fill: string, dark: string, printed: boolean) {
  const s = `fill="${printed ? "url(#print)" : fill}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"`;
  const seam = `fill="none" stroke="${dark}" stroke-width="2" stroke-dasharray="6 5"`;
  switch (kind) {
    case "cap":
      return back
        ? `<path ${s} d="M150 420 Q150 200 400 190 Q650 200 650 420 Z"/><path fill="none" stroke="${dark}" stroke-width="4" d="M340 420 Q400 360 460 420"/><path ${seam} d="M400 195 L400 360"/>`
        : `<path ${s} d="M150 420 Q150 200 400 190 Q650 200 650 420 Z"/><path ${s} d="M130 420 Q400 380 670 420 Q620 520 400 520 Q180 520 130 420 Z" fill="${shade(fill, 0.85)}"/><path ${seam} d="M400 195 L400 410 M270 215 Q260 320 250 410 M530 215 Q540 320 550 410"/><circle cx="400" cy="195" r="10" fill="${dark}"/>`;
    case "pants":
      return `<path ${s} d="M250 120 L550 120 L590 680 L440 680 L400 300 L360 680 L210 680 Z"/><path ${seam} d="M250 160 L550 160 ${back ? "M300 210 L360 210 L360 260 L300 260 Z M440 210 L500 210 L500 260 L440 260 Z" : "M400 160 L400 290 M260 170 Q300 230 330 170 M540 170 Q500 230 470 170"}"/>`;
    case "skirt":
      return `<path ${s} d="M280 160 L520 160 L620 640 L180 640 Z"/><path ${seam} d="M280 200 L520 200 ${back ? "M400 200 L400 380" : ""}"/>`;
    case "dress":
      return `<path ${s} d="M320 110 Q400 ${back ? 120 : 170} 480 110 L520 140 L500 330 L640 680 L160 680 L300 330 L280 140 Z"/><path ${seam} d="M300 330 Q400 350 500 330 ${back ? "M400 120 L400 330" : ""}"/>`;
    case "hoodie":
      return `<path ${s} d="M300 140 L210 170 L110 470 L180 500 L250 330 L260 660 L540 660 L550 330 L620 500 L690 470 L590 170 L500 140 Q400 ${back ? 60 : 230} 300 140 Z"/><path ${s} d="M300 140 Q400 20 500 140 Q400 ${back ? 120 : 200} 300 140 Z" fill="${shade(fill, 0.85)}"/>${back ? "" : `<path ${seam} d="M310 480 L490 480 L520 600 L280 600 Z"/>`}<path ${seam} d="M260 630 L540 630"/>`;
    case "shirt":
    case "tshirt":
    default: {
      const long = kind === "shirt";
      const sleeve = long ? "L110 560 L180 580 L260 300" : "L170 360 L250 390 L260 300";
      const sleeveR = long ? "L540 300 L620 580 L690 560" : "L540 300 L550 390 L630 360";
      let d = `<path ${s} d="M310 130 L200 170 ${sleeve} L260 660 L540 660 ${sleeveR} L600 170 L490 130 Q400 ${back ? 150 : 200} 310 130 Z"/>`;
      if (long && !back) d += `<path fill="${shade(fill, 0.9)}" stroke="${dark}" stroke-width="3" d="M310 130 L360 200 L400 180 L440 200 L490 130 Q400 150 310 130 Z"/><path ${seam} d="M400 185 L400 660"/>${[250, 340, 430, 520, 610].map((y) => `<circle cx="412" cy="${y}" r="7" fill="${shade(fill, 0.6)}"/>`).join("")}`;
      if (!long) d += `<path fill="none" stroke="${dark}" stroke-width="3" d="M320 140 Q400 ${back ? 160 : 210} 480 140"/>`;
      return d + `<path ${seam} d="M265 630 L535 630"/>`;
    }
  }
}

function kindOf(text: string) {
  if (/bon[eé]|cap/i.test(text)) return "cap";
  if (/moletom|hoodie/i.test(text)) return "hoodie";
  if (/vestido|dress/i.test(text)) return "dress";
  if (/saia|skirt/i.test(text)) return "skirt";
  if (/cal[çc]a|pants|jeans/i.test(text)) return "pants";
  if (/camiseta|t-?shirt|malha/i.test(text)) return "tshirt";
  return "shirt";
}

export function nativeVisualSvg(input: Input) {
  const kind = kindOf([input.family, input.category, input.name].join(" "));
  const fill = hex(input.color);
  const dark = shade(fill, 0.45);
  const back = /costas|traseir|back/i.test(input.view ?? "");
  const printed = /estamp/i.test(input.color ?? "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="760" viewBox="0 0 800 760">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
<pattern id="print" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${fill}"/><circle cx="10" cy="10" r="6" fill="${shade(fill, 0.6)}"/><circle cx="30" cy="30" r="6" fill="${shade(fill, 1.3)}"/></pattern></defs>
<g>${shape(kind, back, fill, dark, printed)}</g>
<g opacity=".6" style="mix-blend-mode:multiply">${shape(kind, back, "url(#g)", "none", false).replace(/stroke-dasharray="[^"]*"/g, "")}</g>
</svg>`;
}

export async function nativeVisualPng(input: Input): Promise<string> {
  const svg = nativeVisualSvg(input);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1520;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu desenhar a imagem.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
