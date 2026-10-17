// Sprawdza martwe linki wewnętrzne w zbudowanej stronie (_site/).
// Uruchom po `npm run build`:  npm run check:links
// Bez zależności – tylko Node.js. Kod wyjścia 1, gdy znaleziono błędy.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SITE = new URL("../_site/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

if (!existsSync(SITE)) {
  console.error("Brak katalogu _site/. Najpierw uruchom: npm run build");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Ścieżka pliku w _site -> adres URL strony ("/kontakt/", "/404.html"). */
function urlOf(file) {
  const rel = "/" + relative(SITE, file).split(sep).join("/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}

/** Adres URL -> plik w _site (albo null). */
function fileFor(pathname) {
  let p = decodeURIComponent(pathname);
  const candidates = p.endsWith("/") ? [p + "index.html"] : [p, p + "/index.html", p + ".html"];
  for (const c of candidates) {
    const f = join(SITE, c);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, "utf8");
    const ids = new Set();
    for (const m of html.matchAll(/\s(?:id|name)\s*=\s*["']([^"']+)["']/g)) ids.add(m[1]);
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

const htmlFiles = walk(SITE).filter((f) => f.endsWith(".html"));
const errors = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const pageUrl = urlOf(file);
  for (const m of html.matchAll(/\s(href|src)\s*=\s*["']([^"']*)["']/g)) {
    const [, attr, raw] = m;
    const value = raw.replace(/&amp;/g, "&");
    let target, hash;
    if (value.startsWith("#")) {
      if (value === "#") continue;
      target = file;
      hash = value.slice(1);
    } else if (value.startsWith("/") && !value.startsWith("//")) {
      const u = new URL(value, "https://x.invalid");
      target = fileFor(u.pathname);
      hash = u.hash.slice(1);
      if (!target) {
        errors.push(`${pageUrl}: ${attr}="${raw}" – brak pliku`);
        checked++;
        continue;
      }
    } else continue;
    checked++;
    if (hash && target.endsWith(".html") && !idsOf(target).has(decodeURIComponent(hash))) {
      errors.push(`${pageUrl}: ${attr}="${raw}" – brak elementu id="${hash}"`);
    }
  }
}

console.log(`Sprawdzono ${checked} linków wewnętrznych na ${htmlFiles.length} stronach.`);
if (errors.length) {
  console.error(`Martwe linki (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("OK – brak martwych linków wewnętrznych.");
