// Zrzuty ekranu stron w kilku szerokościach (wymaga uruchomionego `npm start` i Chrome/Edge).
// Użycie: node scripts/screenshots.js <katalog-wyjściowy> [ścieżka ...] [--dark]
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const args = process.argv.slice(2);
const dark = args.includes("--dark");
const [outDir, ...paths] = args.filter((a) => a !== "--dark");
const base = process.env.BASE_URL || "http://localhost:8080";
const widths = (process.env.WIDTHS || "360,768,1366").split(",").map(Number);

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: BROWSERS.find(existsSync), headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
for (const path of paths.length ? paths : ["/"]) {
  for (const w of widths) {
    await page.setViewport({ width: w, height: 900, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
    await page.goto(base + path, { waitUntil: "networkidle0" });
    // Na telefonie (isMobile) szeroka treść powiększa też window.innerWidth – porównujemy z szerokością widoku.
    const overflow = await page.evaluate((vw) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - vw, w);
    const name = `${path.replace(/\//g, "_") || "_"}-${w}${dark ? "-dark" : ""}.png`.replace(/^_+/, "") || "home.png";
    await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
    console.log(`${path} @${w}px → ${name}${overflow > 0 ? `  ⚠ poziomy scroll ${overflow}px` : ""}`);
  }
}
await browser.close();
