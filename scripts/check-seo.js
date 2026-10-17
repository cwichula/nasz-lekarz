// Podstawowa kontrola SEO zbudowanej strony (_site/).
// Uruchom po `npm run build`:  npm run check:seo
// Każda strona: jedno <h1>, unikalny <title> (≤ 60 zn.), unikalny meta description (140–160 zn.),
// link canonical, <html lang="pl">, poprawny JSON w <script type="application/ld+json">.
// Strony z <meta name="robots" content="noindex"> nie muszą mieć description ani canonical.
// Budżety wielkości: main.css ≤ 30 KB, HTML strony głównej ≤ 35 KB, main.js + holidays.js ≤ 8 KB.
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

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[2] ?? m[3]) : null;
};

const files = walk(SITE).filter((f) => f.endsWith(".html"));
const errors = [];
const titles = new Map();
const descs = new Map();

for (const file of files) {
  const url = "/" + relative(SITE, file).split(sep).join("/").replace(/index\.html$/, "");
  const html = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const err = (msg) => errors.push(`${url}: ${msg}`);

  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const robots = metas.find((t) => (attr(t, "name") || "").toLowerCase() === "robots");
  const noindex = robots ? /noindex/i.test(attr(robots, "content") || "") : false;

  const htmlTag = html.match(/<html\b[^>]*>/i);
  if (!htmlTag || attr(htmlTag[0], "lang") !== "pl") err('brak <html lang="pl">');

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) err(`liczba <h1> = ${h1} (powinna być 1)`);

  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = t ? decode(t[1]) : "";
  if (!title) err("brak <title>");
  else {
    if ([...title].length > 60) err(`<title> ma ${[...title].length} zn. (> 60): "${title}"`);
    if (titles.has(title)) err(`<title> taki sam jak na ${titles.get(title)}: "${title}"`);
    else titles.set(title, url);
  }

  const d = metas.find((tag) => (attr(tag, "name") || "").toLowerCase() === "description");
  const desc = d ? attr(d, "content") || "" : "";
  if (!desc) {
    if (!noindex) err("brak meta description");
  } else {
    const n = [...desc].length;
    if (!noindex && (n < 140 || n > 160)) err(`meta description ma ${n} zn. (wymagane 140–160)`);
    if (descs.has(desc)) err(`meta description taki sam jak na ${descs.get(desc)}`);
    else descs.set(desc, url);
  }

  const canon = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((tag) => (attr(tag, "rel") || "").toLowerCase() === "canonical");
  if (!noindex && !(canon && attr(canon, "href"))) err("brak link rel=canonical");

  for (const [i, m] of [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      err(`JSON-LD nr ${i + 1} nie parsuje się: ${e.message}`);
    }
  }
}

// Budżety wielkości plików (bajty, bez kompresji gzip)
const KB = 1024;
const size = (rel) => (existsSync(join(SITE, rel)) ? statSync(join(SITE, rel)).size : 0);
const budgets = [
  // Kierunek „Puls” (docs/design/03-puls.md): karta stanu, plakietki, arkusz telefonów – budżet podniesiony z 30 KB
  { name: "assets/css/main.css", bytes: size("assets/css/main.css"), max: 40 * KB },
  // Strona główna „Puls”: 5 wariantów karty stanu, „Dziś w przychodni”, tydzień tekstem – budżet podniesiony z 35 KB
  { name: "index.html", bytes: size("index.html"), max: 44 * KB },
  // + clinic-state.js (tryby karty stanu); budżet podniesiony z 8 KB
  { name: "assets/js/main.js + holidays.js + clinic-state.js", bytes: size("assets/js/main.js") + size("assets/js/holidays.js") + size("assets/js/clinic-state.js"), max: 14 * KB },
];
for (const b of budgets) {
  console.log(`Budżet: ${b.name} = ${b.bytes} B (limit ${b.max} B)`);
  if (b.bytes > b.max) errors.push(`budżet przekroczony: ${b.name} ma ${b.bytes} B (> ${b.max} B)`);
}

console.log(`Sprawdzono ${files.length} stron HTML.`);
if (errors.length) {
  console.error(`Błędy SEO (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("OK – wszystkie strony spełniają podstawowe wymagania SEO.");
