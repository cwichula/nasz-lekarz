import { test } from "node:test";
import assert from "node:assert/strict";
import { clinicMode, rangeState, progress, formatDuration, toMin, fromMin } from "../src/assets/js/clinic-state.js";
import { isWorkday } from "../src/assets/js/holidays.js";

// Godziny jak w src/_data/clinic.json
const H = { reg: { from: toMin("09:00"), to: toMin("15:00") }, clinic: { from: toMin("08:00"), to: toMin("18:00") } };
const at = (t, workday = true) => clinicMode(toMin(t), workday, H);

test("tryby w dzień roboczy", () => {
  assert.equal(at("06:30"), "after", "noc przed otwarciem");
  assert.equal(at("08:30"), "before", "przychodnia otwarta, rejestracja od 9:00");
  assert.equal(at("09:00"), "open");
  assert.equal(at("10:00"), "open");
  assert.equal(at("13:59"), "open");
  assert.equal(at("14:00"), "soon", "ostatnia godzina rejestracji");
  assert.equal(at("14:40"), "soon");
  assert.equal(at("15:00"), "clinic", "rejestracja zamknięta, lekarz przyjmuje");
  assert.equal(at("16:00"), "clinic");
  assert.equal(at("18:00"), "after");
  assert.equal(at("19:00"), "after");
});

test("weekend i święta – zawsze po godzinach", () => {
  assert.equal(at("10:00", isWorkday(2026, 10, 17, 6)), "after", "sobota");
  assert.equal(at("10:00", isWorkday(2026, 10, 18, 0)), "after", "niedziela");
  assert.equal(at("10:00", isWorkday(2026, 11, 11, 3)), "after", "Święto Niepodległości");
  assert.equal(at("10:00", isWorkday(2026, 12, 24, 4)), "after", "Wigilia");
  assert.equal(at("10:00", isWorkday(2026, 10, 22, 4)), "open", "zwykły czwartek");
});

test("rejestracja zaczynająca się przed otwarciem przychodni", () => {
  const early = { reg: { from: toMin("07:30"), to: toMin("15:00") }, clinic: H.clinic };
  assert.equal(clinicMode(toMin("07:45"), true, early), "open");
});

test("stan przedziału godzin", () => {
  const [f, t] = [toMin("14:00"), toMin("18:00")];
  assert.equal(rangeState(toMin("10:00"), true, f, t), "later");
  assert.equal(rangeState(toMin("15:00"), true, f, t), "now");
  assert.equal(rangeState(toMin("18:00"), true, f, t), "done");
  assert.equal(rangeState(toMin("15:00"), false, f, t), "off");
});

test("postęp i czas trwania", () => {
  assert.equal(progress(toMin("12:00"), H.reg.from, H.reg.to), 0.5);
  assert.equal(progress(toMin("07:00"), H.reg.from, H.reg.to), 0);
  assert.equal(progress(toMin("20:00"), H.reg.from, H.reg.to), 1);
  assert.equal(formatDuration(200), "3 godz. 20 min");
  assert.equal(formatDuration(120), "2 godz.");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(0), "1 min");
  assert.equal(fromMin(480), "8:00");
  assert.equal(fromMin(905), "15:05");
});
