// Polskie dni ustawowo wolne od pracy. Ten sam moduł działa w przeglądarce i w testach (node --test).

/** Data Wielkanocy (algorytm Meeusa/Jonesa/Butchera) jako [miesiąc 1–12, dzień] */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

const pad = (n) => String(n).padStart(2, "0");
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Zbiór dat "RRRR-MM-DD" świąt w danym roku */
export function holidays(year) {
  const [em, ed] = easter(year);
  const base = Date.UTC(year, em - 1, ed);
  const plus = (days) => {
    const t = new Date(base + days * 86400000);
    return key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  };
  const fixed = [
    [1, 1], [1, 6], [5, 1], [5, 3], [8, 15], [11, 1], [11, 11], [12, 25], [12, 26],
  ];
  const set = new Set(fixed.map(([m, d]) => key(year, m, d)));
  if (year >= 2025) set.add(key(year, 12, 24)); // Wigilia – dzień wolny od 1.02.2025
  set.add(plus(0)); // Wielkanoc
  set.add(plus(1)); // Poniedziałek Wielkanocny
  set.add(plus(49)); // Zielone Świątki
  set.add(plus(60)); // Boże Ciało
  return set;
}

export function isHoliday(y, m, d) {
  return holidays(y).has(key(y, m, d));
}

/** Czy dany dzień (y,m,d, dzień tygodnia 0–6) jest dniem pracy przychodni */
export function isWorkday(y, m, d, weekday, workDays = [1, 2, 3, 4, 5]) {
  return workDays.includes(weekday) && !isHoliday(y, m, d);
}
