const test = require("node:test");
const assert = require("node:assert/strict");
require("./dom-shim");
const { CalibraSignatureCard, aggregateDays, fitQuad } = require("../dist/calibra-card.js");

// 24 hourly rows starting at local midnight of the given day
const hours = (day, fn) => Array.from({ length: 24 }, (_, h) => ({ start: new Date(`${day}T${String(h).padStart(2, "0")}:00:00`).getTime(), ...fn(h) }));

test("aggregateDays keeps only complete days and averages temperature", () => {
  const energy = [...hours("2026-01-10", () => ({ change: 1 })), ...hours("2026-01-11", () => ({ change: 0.5 })).slice(0, 12)];
  const temp = [...hours("2026-01-10", (h) => ({ mean: h < 12 ? -2 : 2 })), ...hours("2026-01-11", () => ({ mean: 0 }))];
  const days = aggregateDays(energy, temp);
  assert.equal(days.length, 1);
  assert.equal(days[0].date, "2026-01-10");
  assert.equal(days[0].kwh, 24);
  assert.equal(days[0].t, 0);
});

test("fitQuad recovers a quadratic", () => {
  const pts = [-10, -5, 0, 5, 10, 15].map((t) => ({ t, kwh: 30 - 2 * t + 0.05 * t * t }));
  const f = fitQuad(pts);
  assert.ok(Math.abs(f(5) - (30 - 10 + 1.25)) < 1e-6);
  assert.equal(fitQuad(pts.slice(0, 2)), null);
});

test("the card fetches statistics, splits periods and states the finding", async () => {
  const energy = [], temp = [];
  const add = (day, t, kwh) => { energy.push(...hours(day, () => ({ change: kwh / 24 }))); temp.push(...hours(day, () => ({ mean: t }))); };
  const days = (y, m, n) => Array.from({ length: n }, (_, i) => `${y}-${m}-${String(i + 1).padStart(2, "0")}`);
  days("2026", "03", 20).forEach((d, i) => { const t = -4 + i; add(d, t, 30 - 2 * t); });
  days("2026", "10", 20).forEach((d, i) => { const t = 2 + i * 0.6; add(d, t, 18 - 1 * t); });
  const c = new CalibraSignatureCard();
  c.setConfig({ energy: "sensor.e", temperature: "sensor.t", start: "2026-01-01", periods: [{ name: "Gammal pump", end: "2026-06-15" }, { name: "Ny pump", start: "2026-09-25" }] });
  let asked = null;
  c.hass = { locale: { language: "sv" }, callWS: async (msg) => { asked = msg; return { "sensor.e": energy, "sensor.t": temp }; } };
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(asked.period, "hour");
  const h = c.shadowRoot.innerHTML;
  assert.match(h, /Gammal pump · 20 dygn/);
  assert.match(h, /Ny pump: 13,0 kWh\/dygn vid 5 °C mot 20,0 \(35 % lägre\)/);
  assert.match(h, /<path d="M/);
});
