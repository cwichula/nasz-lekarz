// Konfiguracja Eleventy – strona statyczna NZOZ „Nasz-Lekarz”.
// Wszystkie dane przychodni są w src/_data/*.json – zmiana numeru lub godzin = edycja JSON + `npm run build`.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HtmlBasePlugin } from "@11ty/eleventy";

// Wersja testowa (np. GitHub Pages): PATH_PREFIX=/nasz-lekarz/ TEST_SITE=1 npm run build
const PATH_PREFIX = process.env.PATH_PREFIX || "/";
const IS_TEST = process.env.TEST_SITE === "1";

/** Prosta minifikacja CSS: usuwa komentarze i zbędne białe znaki (bez zmiany selektorów typu ".a :focus"). */
export function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/:\s+/g, ":")
    .replace(/;}/g, "}")
    .trim();
}

/** W treści HTML (poza tagami, <script>, <style>, <title>) zakresy godzin i numery telefonów nie łamią się w środku. */
export function noBreakNumbers(html) {
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<(script|style|title|textarea)\b/i.test(part)) skip++;
        else if (/^<\/(script|style|title|textarea)>/i.test(part)) skip = Math.max(0, skip - 1);
        return part;
      }
      if (skip || !part.trim()) return part;
      return part
        .replace(/\b(\d{1,2}:\d{2}–\d{1,2}:\d{2})\b/g, '<span class="nowrap">$1</span>')
        .replace(/\b(\d{2}) (\d{3}) (\d{2}) (\d{2})\b/g, "$1\u00a0$2\u00a0$3\u00a0$4")
        .replace(/\b(\d{3}) (\d{3}) (\d{3})\b/g, "$1\u00a0$2\u00a0$3");
    })
    .join("");
}

const DAY_NAMES = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const DAY_SHORT = ["nd", "pn", "wt", "śr", "czw", "pt", "sob"];

/** "08:00" -> "8:00" */
function hm(t) {
  return String(t).replace(/^0(\d):/, "$1:");
}

/** [1,2,3,4,5] -> "poniedziałek–piątek"; [2,4] -> "wtorek, czwartek" */
function daysLabel(days, short = false) {
  const names = short ? DAY_SHORT : DAY_NAMES;
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (sorted.length > 2 && consecutive) return `${names[sorted[0]]}–${names[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => names[d]).join(", ");
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/pliki": "pliki" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });

  eleventyConfig.addFilter("hm", hm);
  eleventyConfig.addFilter("timeRange", (r) => (r ? `${hm(r.from)}–${hm(r.to)}` : ""));
  eleventyConfig.addFilter("daysLabel", daysLabel);
  eleventyConfig.addFilter("dayName", (d) => DAY_NAMES[d]);
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("absUrl", (path, base) => new URL(path, base).href);
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));

  /** Godziny danej osoby / działu w danym dniu tygodnia, np. "14:00–18:00" albo "" */
  eleventyConfig.addFilter("hoursOn", (schedule, day) =>
    (schedule || [])
      .filter((s) => s.days.includes(day))
      .map((s) => `${hm(s.from)}–${hm(s.to)}`)
      .join(", ")
  );

  /** Lekarze przyjmujący w danym dniu, według godziny rozpoczęcia: [{name, hours}] */
  eleventyConfig.addFilter("doctorsOn", (doctors, day) =>
    doctors
      .map((doc) => {
        const shifts = doc.schedule.filter((s) => s.days.includes(day));
        return { name: doc.name, from: shifts[0]?.from || "", hours: shifts.map((s) => `${hm(s.from)}–${hm(s.to)}`).join(", ") };
      })
      .filter((x) => x.hours)
      .sort((a, b) => a.from.localeCompare(b.from))
  );

  /** Wszystkie dyżury lekarzy jako lista [{doc, s}] według godziny rozpoczęcia */
  eleventyConfig.addFilter("shifts", (doctors) =>
    doctors.flatMap((doc) => doc.schedule.map((s) => ({ doc, s }))).sort((a, b) => a.s.from.localeCompare(b.s.from))
  );

  /** Godziny dla pacjenta: roboczy znacznik [DO POTWIERDZENIA] (zostaje w clinic.json) → zdanie zrozumiałe dla pacjenta */
  eleventyConfig.addFilter("patientHours", (t) =>
    String(t || "").replace(/\s*\[DO POTWIERDZENIA\]/g, " (godziny mogą się zmienić – zapytaj w rejestracji)")
  );

  // Link telefoniczny z numerem z clinic.json: {% tel clinic.phones.rejestracja %}
  eleventyConfig.addShortcode(
    "tel",
    (p, cls = "") => `<a class="${cls}" href="tel:${p.e164}">${p.display}</a>`
  );
  eleventyConfig.addShortcode(
    "icon",
    (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`
  );

  eleventyConfig.addGlobalData("buildDate", new Date().toISOString());
  eleventyConfig.addGlobalData("isTest", IS_TEST);
  // Przepisuje adresy zaczynające się od "/" na PATH_PREFIX (wersja testowa w podkatalogu)
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addTransform("no-break-numbers", function (content) {
    return (this.page.outputPath || "").endsWith(".html") ? noBreakNumbers(content) : content;
  });

  // Minifikacja CSS po zbudowaniu (budżet: main.css ≤ 25 KB). Źródła w src/assets/css/ zostają czytelne.
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const cssDir = join(dir.output, "assets", "css");
    if (!existsSync(cssDir)) return;
    for (const f of readdirSync(cssDir).filter((n) => n.endsWith(".css"))) {
      const p = join(cssDir, f);
      writeFileSync(p, minifyCss(readFileSync(p, "utf8")));
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    pathPrefix: PATH_PREFIX,
  };
}
