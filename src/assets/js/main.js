// Drobne usprawnienia strony. Bez JS strona działa w pełni – skrypt tylko dodaje wygodę.
import { isWorkday } from "./holidays.js";
import { toMin, clinicMode, rangeState, progress, formatDuration } from "./clinic-state.js";

const DAY_NAMES = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const DAYS_ACC = ["w niedzielę", "w poniedziałek", "we wtorek", "w środę", "w czwartek", "w piątek", "w sobotę"];

/** Aktualna data i godzina w Polsce, niezależnie od strefy urządzenia */
function nowInPoland() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { y: +parts.year, m: +parts.month, d: +parts.day, weekday, minutes: +parts.hour * 60 + +parts.minute };
}

const hm = (t) => t.replace(/^0/, "");

/** Następny dzień pracy po dzisiejszym: zwraca opis "jutro" / "w poniedziałek" */
function nextWorkdayLabel(now) {
  const base = Date.UTC(now.y, now.m - 1, now.d);
  for (let i = 1; i <= 10; i++) {
    const t = new Date(base + i * 86400000);
    const wd = t.getUTCDay();
    if (isWorkday(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), wd)) {
      return i === 1 ? "jutro" : DAYS_ACC[wd];
    }
  }
  return "w najbliższy dzień roboczy";
}

function initStatus() {
  const now = nowInPoland();
  const workday = isWorkday(now.y, now.m, now.d, now.weekday);

  document.querySelectorAll("[data-status]").forEach((el) => {
    const from = el.dataset.from;
    const to = el.dataset.to;
    const what = el.dataset.what || "Rejestracja";
    const open = workday && now.minutes >= toMin(from) && now.minutes < toMin(to);
    let text;
    if (open) text = `${what} czynna teraz – do ${hm(to)}`;
    else if (workday && el.dataset.until && now.minutes >= toMin(to) && now.minutes < toMin(el.dataset.until))
      text = `${what} nieczynna – przychodnia czynna do ${hm(el.dataset.until)}`;
    else if (workday && now.minutes < toMin(from)) text = `${what} nieczynna – otwieramy dziś o ${hm(from)}`;
    else text = `${what} nieczynna – otwieramy ${nextWorkdayLabel(now)} o ${hm(from)}`;
    el.querySelector("[data-status-text]").textContent = text;
    el.classList.remove("is-open", "is-closed");
    el.classList.add(open ? "is-open" : "is-closed");
    el.hidden = false;
  });

  // Wyróżnienie dzisiejszego dnia w tabelach godzin, na osi tygodnia i w kartach lekarzy
  document.querySelectorAll(".is-today").forEach((row) => row.classList.remove("is-today"));
  document.querySelectorAll(`[data-day="${now.weekday}"]`).forEach((row) => {
    row.classList.add("is-today");
    const label = row.querySelector("[data-today-label]");
    if (label) label.hidden = false;
  });

  initStateCard(now, workday);
  initToday(now, workday);
  initRanges(now, workday);
}

/** Karta stanu na stronie głównej: jeden z 5 trybów, odliczanie, pierścień postępu rejestracji */
function initStateCard(now, workday) {
  const card = document.querySelector("[data-state]");
  const h = card
    ? { reg: { from: toMin(card.dataset.regFrom), to: toMin(card.dataset.regTo) }, clinic: { from: toMin(card.dataset.clinicFrom), to: toMin(card.dataset.clinicTo) } }
    : null;
  if (!h) return;
  const mode = clinicMode(now.minutes, workday, h);
  const root = document.documentElement;
  const changed = root.dataset.mode !== mode;
  root.dataset.mode = mode;

  card.querySelectorAll("[data-mode-panel]").forEach((p) => {
    p.hidden = p.dataset.modePanel !== mode;
  });
  card.querySelectorAll('[data-countdown="reg-from"]').forEach((el) => (el.textContent = formatDuration(h.reg.from - now.minutes)));
  card.querySelectorAll('[data-countdown="reg-to"]').forEach((el) => (el.textContent = formatDuration(h.reg.to - now.minutes)));
  card.querySelectorAll("[data-next-open]").forEach((el) => {
    el.textContent = workday && now.minutes < h.clinic.from ? "dziś" : nextWorkdayLabel(now);
  });
  // Odliczanie zmienia się co minutę – czytnik ekranu ogłasza tylko zmianę trybu
  card.querySelector("[aria-live]")?.setAttribute("aria-live", changed ? "polite" : "off");

  // CSSOM (nie atrybut style) – zgodne z CSP style-src 'self'
  card.style.setProperty("--progress", workday ? progress(now.minutes, h.reg.from, h.reg.to).toFixed(3) : "0");
  card.classList.add("is-live");
}

/** „Dziś w przychodni”: pokazuje listę na dziś */
function initToday(now, workday) {
  const box = document.querySelector("[data-today]");
  if (!box) return;
  const name = box.querySelector("[data-today-name]");
  if (name) {
    name.textContent = DAY_NAMES[now.weekday];
    name.hidden = false;
  }
  const live = box.querySelector(".today__live");
  if (live) {
    live.hidden = !workday;
    live.querySelectorAll("[data-days]").forEach((li) => (li.hidden = !li.dataset.days.split(",").includes(String(now.weekday))));
  }
  const closed = box.querySelector("[data-today-closed]");
  if (closed) closed.hidden = workday;
  box.classList.add("is-live");
}

/**
 * Plakietki stanu przedziału godzin (lekarz przyjmuje teraz, linia odbiera…):
 * [data-range] z data-from/data-to albo [data-schedule] (JSON grafiku osoby), teksty w data-l-now/-later/-done/-off.
 */
function initRanges(now, workday) {
  document.querySelectorAll("[data-range], [data-schedule]").forEach((el) => {
    let from = el.dataset.from;
    let to = el.dataset.to;
    let on = workday;
    if (el.dataset.schedule) {
      let today = null;
      try {
        today = JSON.parse(el.dataset.schedule).find((s) => s.days.includes(now.weekday));
      } catch {}
      on = workday && !!today;
      from = today?.from;
      to = today?.to;
    }
    const state = on && from && to ? rangeState(now.minutes, true, toMin(from), toMin(to)) : "off";
    el.textContent = (el.dataset[`l${state[0].toUpperCase()}${state.slice(1)}`] || "").replace("{from}", from ? hm(from) : "");
    el.classList.remove("is-now", "is-later", "is-done", "is-off");
    el.classList.add(`is-${state}`);
    el.hidden = !el.textContent;
  });
}

function initMenu() {
  const btn = document.querySelector("[data-menu-toggle]");
  const nav = document.getElementById(btn?.getAttribute("aria-controls") || "");
  if (!btn || !nav) return;
  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    btn.querySelector("[data-menu-label]").textContent = open ? "Zamknij" : "Menu";
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
      set(false);
      btn.focus();
    }
  });
}

const SIZE_KEY = "nl-text-size";
function initTextSize() {
  const root = document.documentElement;
  const apply = (size) => {
    root.dataset.textSize = size;
    document.querySelectorAll(".textsize button[data-text-size]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.textSize === size))
    );
  };
  let saved = "0";
  try {
    saved = localStorage.getItem(SIZE_KEY) || "0";
  } catch {}
  apply(saved);
  document.querySelectorAll(".textsize button[data-text-size]").forEach((b) =>
    b.addEventListener("click", () => {
      apply(b.dataset.textSize);
      try {
        localStorage.setItem(SIZE_KEY, b.dataset.textSize);
      } catch {}
    })
  );
}

function initPrint() {
  document.querySelectorAll("[data-print]").forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", () => window.print());
  });
}

/** Arkusz „Telefony” w dolnym pasku: Popover API, a w starszych przeglądarkach (np. Safari < 17) – przełączanie klasą */
function initSheet() {
  const sheet = document.getElementById("phones-sheet");
  if (!sheet) return;
  if (typeof sheet.showPopover === "function") return;
  const toggle = document.querySelector("[data-sheet-toggle]");
  const set = (open) => {
    sheet.classList.toggle("is-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    if (open) sheet.querySelector("a")?.focus();
  };
  sheet.classList.add("sheet--fallback");
  toggle?.addEventListener("click", () => set(!sheet.classList.contains("is-open")));
  sheet.querySelector("[data-sheet-close]")?.addEventListener("click", () => {
    set(false);
    toggle?.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheet.classList.contains("is-open")) {
      set(false);
      toggle?.focus();
    }
  });
}

document.documentElement.classList.add("js");
initTextSize();
initMenu();
initStatus();
initPrint();
initSheet();

// Stan „teraz” odświeżany co minutę (równo z pełną minutą) i po powrocie do karty
setTimeout(() => {
  initStatus();
  setInterval(initStatus, 60000);
}, 60000 - (Date.now() % 60000));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") initStatus();
});
