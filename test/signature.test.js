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

// Shared fixture for the reference tests: an old pump at 30 − 2t and a new one at 18 − t
function sigCard(config = {}, states = {}) {
  const energy = [], temp = [];
  const add = (day, t, kwh) => { energy.push(...hours(day, () => ({ change: kwh / 24 }))); temp.push(...hours(day, () => ({ mean: t }))); };
  const days = (y, m, n) => Array.from({ length: n }, (_, i) => `${y}-${m}-${String(i + 1).padStart(2, "0")}`);
  days("2026", "03", 20).forEach((d, i) => { const t = -4 + i; add(d, t, 30 - 2 * t); });
  days("2026", "10", 20).forEach((d, i) => { const t = 2 + i * 0.6; add(d, t, 18 - 1 * t); });
  const c = new CalibraSignatureCard();
  c.setConfig({ energy: "sensor.e", temperature: "sensor.t", start: "2026-01-01",
    periods: [{ name: "Gammal pump", end: "2026-06-15" }, { name: "Ny pump", start: "2026-09-25" }], ...config });
  c._days = aggregateDays(energy, temp);
  c._fetchedAt = Date.now();
  c.hass = { locale: { language: "sv" }, states, callWS: async () => ({}) };
  return c;
}

test("the reference can follow a sensor, rounded to half a degree", () => {
  const states = { "sensor.ute": { state: "8.3" } };
  const c = sigCard({ reference: "sensor.ute" }, states);
  let h = c.shadowRoot.innerHTML;
  assert.match(h, /8,5 °C · ute nu/);
  assert.match(h, /Ny pump: 9,5 kWh\/dygn vid 8,5 °C mot 13,0 \(27 % lägre\)/);
  // a small change that rounds the same does not redraw; a real change moves the line
  c.shadowRoot.innerHTML = "untouched";
  c.hass = { locale: { language: "sv" }, states: { "sensor.ute": { state: "8.4" } }, callWS: async () => ({}) };
  assert.equal(c.shadowRoot.innerHTML, "untouched");
  c.hass = { locale: { language: "sv" }, states: { "sensor.ute": { state: "11.1" } }, callWS: async () => ({}) };
  assert.match(c.shadowRoot.innerHTML, /11 °C · ute nu/);
  // an unavailable sensor falls back to reference_fallback (default 5)
  c.hass = { locale: { language: "sv" }, states: { "sensor.ute": { state: "unavailable" } }, callWS: async () => ({}) };
  assert.match(c.shadowRoot.innerHTML, /vid 5 °C mot 20,0/);
});

test("dragging, the arrow keys and the reset button move the reference", () => {
  const c = sigCard({ reference: 5 });
  // the chart spans 760 px on screen, as in its viewBox; axis -5…15 °C between x 52 and 740
  const svg = { getBoundingClientRect: () => ({ left: 0, width: 760 }), focus() { this.focused = true; } };
  c.shadowRoot.querySelector = (q) => (q === "svg.plot" ? svg : null);
  const s = c._scale;
  assert.deepEqual([s.tmin, s.tmax], [-5, 15]);
  const xOf = (t) => s.L + (t - s.tmin) / (s.tmax - s.tmin) * (s.R - s.L);
  const plot = [{ classList: { contains: (k) => k === "plot" } }];
  const listeners = c.shadowRoot.listeners;
  listeners.pointerdown({ button: 0, clientX: xOf(0.2), composedPath: () => plot, preventDefault() {} });
  let h = c.shadowRoot.innerHTML;
  assert.equal(c._ref(), 0);
  assert.match(h, /Gammal pump · 20 dygn · 30,0 kWh vid 0 °C/);
  assert.doesNotMatch(h, /Ny pump: [^<]*vid 0 °C mot/);          // the new pump has no data down at 0 °C
  assert.match(h, />0 °C<\/text>/);                               // the line's tag, without "ute nu"
  assert.match(h, /Tillbaka till 5 °C/);
  // released: later moves change nothing
  window.dispatch("pointermove", { clientX: xOf(12) });
  assert.equal(c._ref(), 12);
  window.dispatch("pointerup", {});
  window.dispatch("pointermove", { clientX: xOf(3) });
  assert.equal(c._ref(), 12);
  listeners.keydown({ key: "ArrowLeft", composedPath: () => plot, preventDefault() {} });
  assert.equal(c._ref(), 11);
  assert.ok(svg.focused, "focus stays on the chart after a key press");
  listeners.keydown({ key: "ArrowRight", composedPath: () => plot, preventDefault() {} });
  listeners.keydown({ key: "ArrowRight", composedPath: () => plot, preventDefault() {} });
  assert.equal(c._ref(), 13);
  listeners.click({ composedPath: () => [{ classList: { contains: (k) => k === "reset" } }] });
  assert.equal(c._ref(), 5);
  assert.doesNotMatch(c.shadowRoot.innerHTML, /Tillbaka till/);
});

test("refLabel writes whole degrees without decimals", () => {
  const { refLabel } = require("../dist/calibra-card.js");
  assert.equal(refLabel(5, "sv"), "5");
  assert.equal(refLabel(-2.5, "sv"), "−2,5");
  assert.equal(refLabel(null, "sv"), "–");
});
