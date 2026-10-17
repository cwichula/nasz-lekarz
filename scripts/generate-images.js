// Generuje obrazy: src/assets/img/og-image.png (1200×630) i src/static/apple-touch-icon.png (180×180).
// Dane (nazwa, telefon rejestracji) z src/_data/clinic.json, logo z src/_includes/partials/logo.njk.
// Wymaga Chrome lub Edge. Użycie: npm run images   (potem npm run build)
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const clinic = JSON.parse(readFileSync(join(ROOT, "src/_data/clinic.json"), "utf8"));
const logo = readFileSync(join(ROOT, "src/_includes/partials/logo.njk"), "utf8")
  .replace(/\sclass="[^"]*"/, "")
  .replace(/\saria-hidden="true"|\sfocusable="false"/g, "");
const font = (w) => pathToFileURL(join(ROOT, `src/assets/fonts/atkinson-hyperlegible-next-latin-ext-${w}-normal.woff2`)).href;
const fontLatin = (w) => pathToFileURL(join(ROOT, `src/assets/fonts/atkinson-hyperlegible-next-latin-${w}-normal.woff2`)).href;

const NAVY = "#0B4F6C";
const CREAM = "#FDF7F0";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const css = `
@font-face { font-family: AH; font-weight: 400; src: url("${fontLatin(400)}") format("woff2"); unicode-range: U+0000-00FF; }
@font-face { font-family: AH; font-weight: 700; src: url("${fontLatin(700)}") format("woff2"); unicode-range: U+0000-00FF; }
@font-face { font-family: AH; font-weight: 400; src: url("${font(400)}") format("woff2"); unicode-range: U+0100-024F, U+2000-206F; }
@font-face { font-family: AH; font-weight: 700; src: url("${font(700)}") format("woff2"); unicode-range: U+0100-024F, U+2000-206F; }
* { margin: 0; box-sizing: border-box; }
html, body { font-family: AH, sans-serif; }
`;

const og = `<!doctype html><html lang="pl"><meta charset="utf-8"><style>${css}
body { width: 1200px; height: 630px; background: ${CREAM}; color: ${NAVY}; display: flex; flex-direction: column; justify-content: center; padding: 0 96px; border-left: 24px solid ${NAVY}; }
.top { display: flex; align-items: center; gap: 40px; }
.top svg { width: 168px; height: 168px; flex: none; }
h1 { font-size: 104px; font-weight: 700; line-height: 1; letter-spacing: -1px; }
.sub { font-size: 44px; margin-top: 18px; }
.tel { margin-top: 64px; font-size: 40px; font-weight: 400; }
.tel b { display: inline-block; margin-left: 12px; padding: 10px 28px; border-radius: 16px; background: ${NAVY}; color: #fff; font-weight: 700; }
</style><body>
<div class="top">${logo}<div><h1>${esc(clinic.name)}</h1><p class="sub">Przychodnia NFZ · ${esc(clinic.address.city)}</p></div></div>
<p class="tel">${esc(clinic.phones.rejestracja.label)}: <b>${esc(clinic.phones.rejestracja.display)}</b></p>
</body></html>`;

// Ikona: bez zaokrągleń i przezroczystości (iOS sam zaokrągla rogi) – tło granatowe na całości.
const icon = `<!doctype html><html><meta charset="utf-8"><style>${css}
body { width: 180px; height: 180px; background: ${NAVY}; }
svg { width: 180px; height: 180px; display: block; }
</style><body>${logo.replace(/<rect[^>]*\/>/, `<rect width="48" height="48" fill="${NAVY}"/>`).replace('viewBox="0 0 48 48"', 'viewBox="2 2 44 44"')}</body></html>`;

const jobs = [
  { html: og, out: "src/assets/img/og-image.png", width: 1200, height: 630 },
  { html: icon, out: "src/static/apple-touch-icon.png", width: 180, height: 180 },
];

const executablePath = BROWSERS.find(existsSync);
if (!executablePath) {
  console.error("Nie znaleziono Chrome/Edge. Ustaw zmienną CHROME_PATH.");
  process.exit(1);
}
const tmp = mkdtempSync(join(tmpdir(), "nasz-lekarz-img-"));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--allow-file-access-from-files"] });
try {
  const page = await browser.newPage();
  for (const [i, job] of jobs.entries()) {
    const file = join(tmp, `job-${i}.html`);
    writeFileSync(file, job.html);
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const outPath = join(ROOT, job.out);
    mkdirSync(join(outPath, ".."), { recursive: true });
    await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y: 0, width: job.width, height: job.height } });
    console.log(`zapisano ${job.out} (${job.width}×${job.height})`);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
