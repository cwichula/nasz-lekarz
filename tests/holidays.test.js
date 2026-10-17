import { test } from "node:test";
import assert from "node:assert/strict";
import { easter, holidays, isWorkday } from "../src/assets/js/holidays.js";

test("Wielkanoc w latach 2026–2035", () => {
  const expected = {
    2026: [4, 5], 2027: [3, 28], 2028: [4, 16], 2029: [4, 1], 2030: [4, 21],
    2031: [4, 13], 2032: [3, 28], 2033: [4, 17], 2034: [4, 9], 2035: [3, 25],
  };
  for (const [y, md] of Object.entries(expected)) assert.deepEqual(easter(+y), md, `rok ${y}`);
});

test("Boże Ciało i Poniedziałek Wielkanocny 2026", () => {
  const h = holidays(2026);
  assert.ok(h.has("2026-04-06"), "Poniedziałek Wielkanocny");
  assert.ok(h.has("2026-06-04"), "Boże Ciało");
});

test("Wigilia wolna od 2025", () => {
  assert.ok(holidays(2025).has("2025-12-24"));
  assert.ok(!holidays(2024).has("2024-12-24"));
});

test("dni pracy", () => {
  assert.equal(isWorkday(2026, 10, 19, 1), true); // zwykły poniedziałek
  assert.equal(isWorkday(2026, 10, 17, 6), false); // sobota
  assert.equal(isWorkday(2026, 11, 11, 3), false); // Święto Niepodległości (środa)
});
