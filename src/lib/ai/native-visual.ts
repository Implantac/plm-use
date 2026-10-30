// Visual nativo 3D Volumétrico do AI Product Studio: renderiza a peça localmente
// com iluminação de estúdio, sombreamento cilíndrico, textura de trama têxtil,
// profundidade de gola interna, dobras orgânicas e pespontos duplos (SVG → PNG HD),
// sem consumir créditos do provedor quando em modo local/offline.

type Input = {
  family?: string;
  category?: string;
  name?: string;
  color?: string;
  view?: string;
  transparent?: boolean;
};

const COLORS: Record<string, string> = {
  preto: "#1c1d21",
  branco: "#f5f4f0",
  "off-white": "#ede7da",
  areia: "#d5c2a1",
  bege: "#d8c3a2",
  azul: "#2e547d",
  marinho: "#1b2b48",
  verde: "#2e684e",
  oliva: "#666b3c",
  vermelho: "#9e2d2d",
  rosa: "#d48f9c",
  cinza: "#7f848c",
  caramelo: "#a9713f",
  laranja: "#d47935",
  terracota: "#c26444",
};

function resolveHex(color = ""): string {
  const hexMatch = color.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) return hexMatch[0];
  const c = color.toLowerCase();
  const key = Object.keys(COLORS).find((k) => c.includes(k));
  return key ? COLORS[key] : "#c8b79e";
}

function adjustHex(h: string, factor: number): string {
  const clean = h.replace("#", "");
  const n = parseInt(clean.length === 6 ? clean : "c8b79e", 16);
  const ch = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * factor)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function kindOf(text: string) {
  if (/bon[eé]|cap/i.test(text)) return "cap";
  if (/moletom|hoodie/i.test(text)) return "hoodie";
  if (/vestido|dress/i.test(text)) return "dress";
  if (/saia|skirt/i.test(text)) return "skirt";
  if (/cal[çc]a|pants|jeans/i.test(text)) return "pants";
  if (/camiseta|t-?shirt|malha|dry/i.test(text)) return "tshirt";
  return "shirt";
}

function renderVolumetricGarment(
  kind: string,
  back: boolean,
  printed: boolean,
  strokeDark: string,
  collarDark: string,
): string {
  const baseFill = printed ? "url(#fabricPrint)" : "url(#torsoVolume)";
  const stitch = `fill="none" stroke="${strokeDark}" stroke-opacity="0.55" stroke-width="1.6" stroke-dasharray="4 3"`;
  const drapeCrease = `fill="none" stroke="url(#creaseGrad)" stroke-width="6" stroke-linecap="round" opacity="0.38"`;

  switch (kind) {
    case "cap":
      return `
        <g filter="url(#dropShadow)">
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M180 430 C180 220 270 175 400 175 C530 175 620 220 620 430 Z"/>
          ${
            back
              ? `<path fill="${collarDark}" d="M335 430 Q400 365 465 430 Z"/><rect x="355" y="416" width="90" height="14" rx="5" fill="${strokeDark}"/>`
              : `<path fill="url(#visorGrad)" stroke="${strokeDark}" stroke-width="2" d="M150 425 Q400 378 650 425 Q605 535 400 538 Q195 535 150 425 Z"/>`
          }
          <path ${stitch} d="M400 178 L400 418 M285 200 Q268 315 255 422 M515 200 Q532 315 545 422"/>
          <circle cx="400" cy="177" r="9" fill="${strokeDark}"/>
        </g>`;
    case "pants":
      return `
        <g filter="url(#dropShadow)">
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M258 115 L542 115 L580 685 L446 685 L400 305 L354 685 L220 685 Z"/>
          <path fill="url(#fabricGrainOverlay)" opacity="0.22" d="M258 115 L542 115 L580 685 L446 685 L400 305 L354 685 L220 685 Z"/>
          <path ${drapeCrease} d="M300 260 Q292 460 285 660 M500 260 Q508 460 515 660"/>
          <path ${stitch} d="M258 156 L542 156 ${
            back
              ? "M295 205 L362 205 L356 276 L328 292 L301 276 Z M438 205 L505 205 L499 276 L472 292 L444 276 Z"
              : "M400 156 L400 292 M262 168 Q304 232 332 164 M538 168 Q496 232 468 164"
          } M222 668 L352 668 M448 668 L578 668"/>
        </g>`;
    case "dress":
      return `
        <g filter="url(#dropShadow)">
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M318 112 Q400 ${back ? 124 : 176} 482 112 L532 142 L498 320 C556 435 608 555 636 685 L164 685 C192 555 244 435 302 320 L268 142 Z"/>
          <path ${drapeCrease} d="M350 340 Q325 510 295 670 M400 345 L400 675 M450 340 Q475 510 505 670"/>
          <path ${stitch} d="M302 320 Q400 340 498 320 M170 668 L630 668"/>
        </g>`;
    case "skirt":
      return `
        <g filter="url(#dropShadow)">
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M282 155 L518 155 L618 650 L182 650 Z"/>
          <path ${drapeCrease} d="M340 220 Q315 430 288 635 M400 220 L400 640 M460 220 Q485 430 512 635"/>
          <path ${stitch} d="M285 194 L515 194 M188 632 L612 632"/>
        </g>`;
    case "hoodie":
      return `
        <g filter="url(#dropShadow)">
          <path fill="${collarDark}" stroke="${strokeDark}" stroke-width="2" d="M292 145 C295 36 505 36 508 145 Q400 185 292 145 Z"/>
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M300 138 L202 174 L112 482 L182 508 L254 320 L262 664 L538 664 L546 320 L618 508 L688 482 L598 174 L500 138 Q400 ${back ? 152 : 210} 300 138 Z"/>
          <path ${drapeCrease} d="M295 250 Q306 430 295 615 M505 250 Q494 430 505 615"/>
          ${!back ? `<path fill="rgba(0,0,0,0.06)" stroke="${strokeDark}" stroke-opacity="0.5" stroke-width="1.8" d="M308 475 L492 475 L518 608 L282 608 Z"/>` : ""}
          <rect x="262" y="628" width="276" height="36" rx="4" fill="rgba(0,0,0,0.09)"/>
          <path ${stitch} d="M262 628 L538 628"/>
        </g>`;
    case "shirt":
    case "tshirt":
    default: {
      const isShirt = kind === "shirt";
      const leftArm = isShirt ? "L114 555 L182 578 L262 296" : "L162 355 L242 388 L262 294";
      const rightArm = isShirt ? "L538 296 L618 578 L686 555" : "L538 294 L558 388 L638 355";
      return `
        <g filter="url(#dropShadow)">
          ${
            !back
              ? `<ellipse cx="400" cy="144" rx="84" ry="26" fill="${collarDark}" stroke="${strokeDark}" stroke-width="1.8"/>`
              : ""
          }
          <path fill="${baseFill}" stroke="${strokeDark}" stroke-width="2" d="M312 128 L200 170 ${leftArm} C266 425 260 545 258 662 Q400 672 542 662 C540 545 534 425 538 294 ${rightArm} L600 170 L488 128 Q400 ${back ? 150 : 196} 312 128 Z"/>
          <path fill="url(#fabricGrainOverlay)" opacity="0.2" d="M312 128 L200 170 ${leftArm} C266 425 260 545 258 662 Q400 672 542 662 C540 545 534 425 538 294 ${rightArm} L600 170 L488 128 Q400 ${back ? 150 : 196} 312 128 Z"/>
          <path ${drapeCrease} d="M306 235 Q318 420 296 632 M494 235 Q482 420 504 632 M375 310 Q382 480 370 645"/>
          ${
            isShirt && !back
              ? `<path fill="rgba(255,255,255,0.08)" stroke="${strokeDark}" stroke-width="2" d="M312 128 L358 198 L400 174 L442 198 L488 128 Q400 150 312 128 Z"/>
                 <rect x="391" y="174" width="18" height="492" fill="rgba(0,0,0,0.05)" stroke="${strokeDark}" stroke-opacity="0.35" stroke-width="1"/>
                 ${[235, 315, 395, 475, 555].map((y) => `<circle cx="400" cy="${y}" r="5.5" fill="#f8fafc" stroke="${strokeDark}" stroke-width="1.2"/>`).join("")}`
              : `<path fill="none" stroke="${strokeDark}" stroke-opacity="0.65" stroke-width="7" d="M315 133 Q400 ${back ? 154 : 200} 485 133"/>`
          }
          <path ${stitch} d="M262 642 Q400 652 538 642 M262 647 Q400 657 538 647 M202 172 Q242 232 262 294 M598 172 Q558 232 538 294"/>
        </g>`;
    }
  }
}

export function nativeVisualSvg(input: Input) {
  const kind = kindOf([input.family, input.category, input.name].join(" "));
  const fill = resolveHex(input.color);
  const highlight = adjustHex(fill, 1.14);
  const midShadow = adjustHex(fill, 0.86);
  const deepShadow = adjustHex(fill, 0.62);
  const collarDark = adjustHex(fill, 0.48);
  const back = /costas|traseir|back/i.test(input.view ?? "");
  const printed = /estamp/i.test(input.color ?? "");
  const isTransparent = input.transparent ?? true;
  const studioBackdrop = isTransparent
    ? ""
    : `<rect width="800" height="760" fill="url(#studioCyclorama)"/><ellipse cx="400" cy="708" rx="195" ry="22" fill="rgba(15,23,42,0.16)" filter="url(#floorBlur)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="760" viewBox="0 0 800 760">
  <defs>
    <radialGradient id="studioCyclorama" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#f8f9fb"/>
      <stop offset="70%" stop-color="#eceff3"/>
      <stop offset="100%" stop-color="#dde2ea"/>
    </radialGradient>
    <linearGradient id="torsoVolume" x1="0%" y1="15%" x2="100%" y2="22%">
      <stop offset="0%" stop-color="${midShadow}"/>
      <stop offset="24%" stop-color="${highlight}"/>
      <stop offset="52%" stop-color="${fill}"/>
      <stop offset="78%" stop-color="${highlight}"/>
      <stop offset="100%" stop-color="${deepShadow}"/>
    </linearGradient>
    <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${midShadow}"/>
      <stop offset="100%" stop-color="${deepShadow}"/>
    </linearGradient>
    <linearGradient id="creaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.1"/>
    </linearGradient>
    <pattern id="fabricGrainOverlay" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 3 H6 M3 0 V6" stroke="#000" stroke-opacity="0.14" stroke-width="0.6"/>
    </pattern>
    <pattern id="fabricPrint" width="36" height="36" patternUnits="userSpaceOnUse">
      <rect width="36" height="36" fill="${fill}"/>
      <circle cx="9" cy="9" r="5" fill="${deepShadow}" opacity="0.55"/>
      <circle cx="27" cy="27" r="5" fill="${highlight}" opacity="0.65"/>
    </pattern>
    <filter id="dropShadow" x="-12%" y="-8%" width="124%" height="124%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.22"/>
    </filter>
    <filter id="floorBlur" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  ${studioBackdrop}
  ${renderVolumetricGarment(kind, back, printed, deepShadow, collarDark)}
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
