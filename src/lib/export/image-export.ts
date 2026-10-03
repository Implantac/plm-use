// Exporta imagens geradas (conceito/desenho técnico) em vários formatos, tudo no navegador.
export type ExportFormat = "png" | "jpg" | "pdf" | "psd" | "eps" | "ai";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "png", label: "PNG", hint: "Fundo transparente" },
  { id: "jpg", label: "JPG", hint: "Fundo branco" },
  { id: "pdf", label: "PDF", hint: "Abre no CorelDRAW e Illustrator" },
  { id: "ai", label: "Illustrator (.ai)", hint: "Compatível com PDF" },
  { id: "eps", label: "EPS", hint: "Abre no CorelDRAW" },
  { id: "psd", label: "Photoshop (.psd)", hint: "Camada transparente · After Effects" },
];

async function loadCanvas(src: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

function flatten(c: HTMLCanvasElement) {
  const f = document.createElement("canvas");
  f.width = c.width;
  f.height = c.height;
  const ctx = f.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, f.width, f.height);
  ctx.drawImage(c, 0, 0);
  return f;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao gerar imagem"))), type, q));

async function pdfBlob(c: HTMLCanvasElement) {
  const { jsPDF } = await import("jspdf");
  const pt = (px: number) => (px * 72) / 150;
  const w = pt(c.width), h = pt(c.height);
  const doc = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "pt", format: [w, h] });
  doc.addImage(c.toDataURL("image/png"), "PNG", 0, 0, w, h);
  return doc.output("blob");
}

function epsBlob(src: HTMLCanvasElement) {
  const c = flatten(src);
  const { width: w, height: h } = c;
  const data = c.getContext("2d")!.getImageData(0, 0, w, h).data;
  const hex: string[] = [];
  let line = "";
  for (let i = 0; i < data.length; i += 4) {
    for (let k = 0; k < 3; k++) line += data[i + k].toString(16).padStart(2, "0");
    if (line.length >= 120) { hex.push(line); line = ""; }
  }
  if (line) hex.push(line);
  const ps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${w} ${h}
%%Creator: USE MODA PLM
%%EndComments
gsave
${w} ${h} scale
${w} ${h} 8 [${w} 0 0 -${h} 0 ${h}]
currentfile /ASCIIHexDecode filter false 3 colorimage
${hex.join("\n")}>
grestore
showpage
%%EOF
`;
  return new Blob([ps], { type: "application/postscript" });
}

async function psdBlob(c: HTMLCanvasElement, name: string) {
  const { writePsd } = await import("ag-psd");
  const buf = writePsd({ width: c.width, height: c.height, children: [{ name, canvas: c }] });
  return new Blob([buf], { type: "image/vnd.adobe.photoshop" });
}

export async function exportImage(src: string, baseName: string, format: ExportFormat) {
  const c = await loadCanvas(src);
  const name = `${baseName}.${format}`;
  switch (format) {
    case "png": return save(await toBlob(c, "image/png"), name);
    case "jpg": return save(await toBlob(flatten(c), "image/jpeg", 0.95), name);
    case "pdf": return save(await pdfBlob(c), name);
    case "ai": return save(new Blob([await pdfBlob(c)], { type: "application/postscript" }), name);
    case "eps": return save(epsBlob(c), name);
    case "psd": return save(await psdBlob(c, baseName), name);
  }
}
