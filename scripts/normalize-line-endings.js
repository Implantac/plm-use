import fs from "fs";
import path from "path";

// Converts CRLF -> LF for repo files (excluding generated deps/build output).

const ROOT = path.resolve(process.cwd());

const SKIP_DIRS = new Set(["node_modules", "dist", ".output", ".vinxi", "public", ".git"]);

const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "bun.lock"]);

// TypeScript-aware editors may parse this .js as TS; keep it plain JS.

const ALLOWED_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".md",
  ".json",
  ".yml",
  ".yaml",
  ".html",
]);

function shouldSkipPath(p) {
  const parts = p.split(path.sep);
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return true;
  }
  const base = path.basename(p);
  return SKIP_FILES.has(base);
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out = walk(p, out);
    } else {
      if (shouldSkipPath(p)) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) continue;
      out.push(p);
    }
  }
  return out;
}

function countCRLF(buf) {
  let count = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10) count++;
  }
  return count;
}

function normalizeFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const crlfCount = countCRLF(buf);
  if (crlfCount === 0) return { changed: false, crlfCount: 0 };

  // Convert bytes safely (assumes text content).
  const text = buf.toString("utf8");
  const normalized = text.replace(/\r\n/g, "\n");

  if (normalized === text) return { changed: false, crlfCount };
  fs.writeFileSync(filePath, normalized, "utf8");
  return { changed: true, crlfCount };
}

function main() {
  const files = walk(ROOT);
  let changed = 0;
  let checked = 0;
  let totalCrLf = 0;

  for (const f of files) {
    checked++;
    const res = normalizeFile(f);
    if (res.changed) {
      changed++;
      totalCrLf += res.crlfCount;
      console.log(`Normalized: ${path.relative(ROOT, f)} (CRLF: ${res.crlfCount})`);
    }
  }

  console.log(`\nDone. Checked: ${checked}, Changed: ${changed}, Total CRLF removed: ${totalCrLf}`);
}

main();
