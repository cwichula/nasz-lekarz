// Drobne usprawnienia strony. Bez JS strona działa w pełni – skrypt tylko dodaje wygodę.
import { isWorkday } from "./holidays.js";

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

const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
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
    else if (workday && now.minutes < toMin(from)) text = `${what} nieczynna – otwieramy dziś o ${hm(from)}`;
    else text = `${what} nieczynna – otwieramy ${nextWorkdayLabel(now)} o ${hm(from)}`;
    el.querySelector("[data-status-text]").textContent = text;
    el.classList.add(open ? "is-open" : "is-closed");
    el.hidden = false;
  });

  // Wyróżnienie dzisiejszego dnia w tabelach godzin
  document.querySelectorAll(`[data-day="${now.weekday}"]`).forEach((row) => {
    row.classList.add("is-today");
    const label = row.querySelector("[data-today-label]");
    if (label) label.hidden = false;
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

/** Menu „Telefony” w dolnym pasku: zamykanie klawiszem Escape, kliknięciem obok i po wyjściu fokusem */
function initCallbar() {
  const d = document.querySelector("details.callbar__more");
  if (!d) return;
  const close = () => d.removeAttribute("open");
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && d.open) {
      close();
      d.querySelector("summary")?.focus();
    }
  });
  d.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !d.contains(e.relatedTarget)) close();
  });
  document.addEventListener("click", (e) => {
    if (d.open && !d.contains(e.target)) close();
  });
}

document.documentElement.classList.add("js");
initTextSize();
initMenu();
initStatus();
initPrint();
initCallbar();
