// Podgląd wariantów projektu na jednym serwerze: http://localhost:8080
//   /         – obecna strona („Puls”) + /origin/ (strona z 2019 r.) i /test/ (jej odświeżona wersja)
//   /va/ /vb/ /vc/ – warianty A, B, C (z noindex)
//
// node scripts/preview.js              – buduje wszystko i uruchamia serwer
// node scripts/preview.js --build-only – tylko buduje (npm run build:variants)
// node scripts/preview.js --serve-only – tylko serwuje to, co już jest w _site
// PORT=8081 node scripts/preview.js    – inny port
//
// Serwer jest statyczny i niczego nie przebudowuje (eleventy --serve wyczyściłby katalogi wariantów).

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, createReadStream } from "node:fs";
import { join, normalize, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_site");
const ELEVENTY = join(ROOT, "node_modules", "@11ty", "eleventy", "cmd.cjs");
const args = process.argv.slice(2);
const PORT = Number(process.env.PORT) || 8080;

/** Jedno uruchomienie Eleventy z podanymi zmiennymi środowiska */
function build(label, env, extraArgs = []) {
  console.log(`\n▸ ${label}`);
  const r = spawnSync(process.execPath, [ELEVENTY, "--quiet", ...extraArgs], {
    cwd: ROOT,
    stdio: "inherit",
    // Czyste środowisko dla każdego wariantu (bez TEST_SITE/VARIANT odziedziczonych z powłoki)
    env: { ...process.env, TEST_SITE: "", VARIANT: "", PREVIEWS: "", PATH_PREFIX: "", ...env },
  });
  if (r.status !== 0) {
    console.error(`Błąd budowania: ${label}`);
    process.exit(r.status || 1);
  }
}

export function buildAll() {
  // Najpierw strona główna (do _site), potem warianty do podkatalogów – Eleventy nie czyści katalogu wyjściowego
  build("/ (Puls) + /origin/ + /test/", { PREVIEWS: "1" });
  for (const v of ["a", "b", "c"]) {
    build(`/v${v}/ (wariant ${v.toUpperCase()})`, { VARIANT: v, PATH_PREFIX: `/v${v}/` }, [`--output=_site/v${v}`]);
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** Nagłówki bezpieczeństwa z bloku "/*" w _site/_headers (CSP itd.) – żeby podgląd łapał np. style inline. HSTS pomijamy (localhost). */
function securityHeaders() {
  const file = join(OUT, "_headers");
  if (!existsSync(file)) return {};
  const headers = {};
  let inBlock = false;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === "/*";
      continue;
    }
    const m = inBlock && line.match(/^\s+([\w-]+):\s*(.+)$/);
    if (m && m[1].toLowerCase() !== "strict-transport-security") headers[m[1]] = m[2].trim();
  }
  return headers;
}

export function serve() {
  if (!existsSync(join(OUT, "index.html"))) {
    console.error("Brak _site/index.html – najpierw zbuduj: npm run build:variants");
    process.exit(1);
  }
  const extra = securityHeaders();
  createServer((req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = normalize(join(OUT, path));
    if (!file.startsWith(OUT)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith("/")) {
        res.writeHead(301, { Location: path + "/" }).end();
        return;
      }
      file = join(file, "index.html");
    }
    let status = 200;
    if (!existsSync(file)) {
      // 404 z właściwego wariantu (/va/… → _site/va/404.html)
      const v = path.match(/^\/(v[abc])\//);
      file = join(OUT, v ? v[1] : "", "404.html");
      status = 404;
      if (!existsSync(file)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
        return;
      }
    }
    res.writeHead(status, { ...extra, "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).pipe(res);
  }).listen(PORT, () => {
    const base = `http://localhost:${PORT}`;
    console.log(`\nPodgląd: ${base}/  ·  ${base}/va/  ·  ${base}/vb/  ·  ${base}/vc/  ·  ${base}/origin/  ·  ${base}/test/`);
    console.log("Zatrzymanie: Ctrl+C");
  });
}

if (!args.includes("--serve-only")) buildAll();
if (!args.includes("--build-only")) serve();
