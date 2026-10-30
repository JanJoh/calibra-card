const test = require("node:test");
const assert = require("node:assert/strict");
require("./dom-shim");
const { CalibraCard, DEFAULT_ENTITIES, tankColor, fmt } = require("../dist/calibra-card.js");

const P = "diplomat_inverter_duo";
const SITE = {
  power: "sensor.vp_power",
  valve: "binary_sensor.valve_tap",
  heater_power: "sensor.heater_power",
  immersion: "sensor.immersion_step",
  price: "sensor.price",
};

function states(over = {}) {
  const base = {
    [`sensor.${P}_outdoor_temperature`]: "9.56",
    [`sensor.${P}_first_prioritised_demand`]: "Heat",
    [`binary_sensor.${P}_compressor_control_signal`]: "on",
    [`sensor.${P}_compressor_speed_percent`]: "38",
    [`sensor.${P}_compressor_speed_rpm`]: "2940",
    [`sensor.${P}_compressor_current_gear`]: "4",
    [`sensor.${P}_compressor_available_gears`]: "10",
    [`number.${P}_maximum_allowed_gear_in_heating`]: "10",
    [`number.${P}_maximum_allowed_gear_in_tap_water`]: "7",
    [`number.${P}_minimum_allowed_gear_in_tap_water`]: "5",
    [`sensor.${P}_compressor_temporarily_blocked`]: "0",
    [`sensor.${P}_brine_in_temperature`]: "2.1",
    [`sensor.${P}_brine_out_temperature`]: "-0.4",
    [`sensor.${P}_brine_circulation_pump_speed`]: "62",
    [`sensor.${P}_condenser_circulation_pump_speed`]: "55",
    [`sensor.${P}_condenser_in_temperature`]: "28.3",
    [`sensor.${P}_condenser_out_temperature`]: "33.1",
    [`sensor.${P}_tap_water_top_temperature`]: "52.5",
    [`sensor.${P}_tap_water_lower_temperature`]: "51.8",
    [`binary_sensor.${P}_heating_season_active`]: "on",
    [`number.${P}_heating_season_stop_temperature`]: "15",
    [`sensor.${P}_heating_season_integral_value`]: "-150",
    [`binary_sensor.${P}_sum_alarm`]: "off",
    "sensor.vp_power": "1420",
    "binary_sensor.valve_tap": "off",
    "sensor.heater_power": "0",
    "sensor.immersion_step": "0",
    "sensor.price": "1.2227",
    "input_boolean.sauna_guard": "off",
    ...over,
  };
  const out = {};
  const changed = new Date(Date.now() - 50 * 60e3).toISOString();   // everything last changed 50 min ago
  for (const [k, v] of Object.entries(base)) out[k] = { state: v, last_changed: changed, attributes: k === "sensor.price" ? { unit_of_measurement: "kr/kWh" } : {} };
  return out;
}

function card(over = {}, config = {}, lang = "sv") {
  const c = new CalibraCard();
  c.setConfig({ borehole_depth: 88, entities: SITE, notices: [{ entity: "input_boolean.sauna_guard", text: "Bastuvakten begränsar kompressorn." }], ...config });
  c._statsAt = Date.now();          // no websocket in tests
  c.hass = { states: states(over), locale: { language: lang } };
  return c;
}

const html = (c) => c.shadowRoot.innerHTML;
const count = (s, needle) => s.split(needle).length - 1;

test("heating: radiator branch live, valve points right, demand translated", () => {
  const c = card();
  const m = c._model();
  assert.equal(m.heatOn, true);
  assert.equal(m.hwOn, false);
  assert.equal(m.chip.text, "Värme");
  assert.match(m.compText, /^38 % · 2.940 rpm$/);
  assert.match(m.why, /^Går sedan (igår )?\d\d:\d\d$/, "the chip says Värme; the line says since when");
  assert.ok(!html(c).includes("Växel"));
  assert.match(html(c), /rotate\(0\)/);
  assert.match(html(c), /1,42 kW/);
});

test("hot water with the sauna guard: hot water branch, limited gears hatched, notice in the explanation", () => {
  const c = card({
    [`sensor.${P}_first_prioritised_demand`]: "Hot water",
    "binary_sensor.valve_tap": "on",
    [`number.${P}_maximum_allowed_gear_in_tap_water`]: "3",
    [`sensor.${P}_compressor_current_gear`]: "3",
    "input_boolean.sauna_guard": "on",
    "sensor.immersion_step": "1",
    "sensor.heater_power": "2800",
  });
  const m = c._model();
  assert.equal(m.hwOn, true);
  assert.equal(m.heatOn, false);
  assert.ok(!m.why.includes("växel"));
  assert.deepEqual(m.segs.slice(0, 4), ["on-limited", "on-limited", "on-limited", "blocked"]);
  assert.equal(m.tone, "warn");
  assert.match(m.why, /Bastuvakten begränsar/);
  assert.match(m.why, /Intern elpatron har gått in/);
  assert.equal(m.heater.on, true);
  assert.match(html(c), /rotate\(90\)/);
});

test("heating stop: chip, explanation and pill say so", () => {
  const c = card({
    [`binary_sensor.${P}_heating_season_active`]: "off",
    [`binary_sensor.${P}_compressor_control_signal`]: "off",
    [`sensor.${P}_first_prioritised_demand`]: "No demand",
    [`sensor.${P}_outdoor_temperature`]: "18.4",
  });
  const m = c._model();
  assert.equal(m.chip.text, "Värmestopp");
  assert.equal(m.tone, "stop");
  assert.match(m.why, /ute 18,4 °C är över gränsen 15 °C/);
  assert.match(html(c), /Värmestopp på \(15 °C\)/);
});

test("idle shows degree minutes; pipes are grey", () => {
  const c = card({
    [`binary_sensor.${P}_compressor_control_signal`]: "off",
    [`sensor.${P}_first_prioritised_demand`]: "No demand",
    [`sensor.${P}_brine_circulation_pump_speed`]: "0",
  });
  const m = c._model();
  assert.equal(m.compText, "Står still");
  assert.match(m.why, /^Står still sedan (igår )?\d\d:\d\d$/, "no degree minutes, no repeat of the chip");
  assert.match(m.integral, /^Värmesäsongsintegral [−-]150$/);
  const rows = c._detailModel().at(-1).rows.filter(Boolean).map(([label, value]) => `${label}: ${value}`);
  assert.ok(rows.includes("Värmesäsongsintegral: −150") || rows.includes("Värmesäsongsintegral: -150"), rows.join(" | "));
  assert.ok(rows.some((r) => r.startsWith("Värmestopp, gräns: ")));
  assert.equal(m.brineOn, false);
  assert.ok(!html(c).includes('stroke="#2f6fb3"'));
});

test("an alarm overrides everything else", () => {
  const m = card({ [`binary_sensor.${P}_sum_alarm`]: "on" })._model();
  assert.equal(m.tone, "alert");
  assert.match(m.why, /larm/);
});

test("the restart delay after a stop shows the minutes left, not a block", () => {
  const m = card({ [`sensor.${P}_compressor_temporarily_blocked`]: "145" })._model();
  assert.match(m.why, /Omstartsspärr efter stopp · 3 min kvar\./);
  assert.ok(!m.why.includes("blockerad"));
  assert.match(card({ [`sensor.${P}_compressor_temporarily_blocked`]: "11" })._model().why, /1 min kvar/);
  assert.ok(!card({})._model().why.includes("Omstartsspärr"));
});

test("optional parts disappear when not configured", () => {
  const c = card({}, { entities: {}, notices: [] });
  const m = c._model();
  assert.equal(m.power, null);
  assert.equal(m.heater, null);
  assert.equal(m.immersion, null);
  assert.ok(!html(c).includes("Beredare"));
  assert.ok(html(c).includes("Kranar"));
});

test("unavailable sensors render as a dash, not NaN", () => {
  const c = card({ [`sensor.${P}_brine_in_temperature`]: "unavailable" });
  assert.equal(c._model().brineIn, "–");
  assert.ok(!html(c).includes("NaN"));
});

test("the refrigerant view toggles and lists pressures", () => {
  const c = card({ [`sensor.${P}_high_pressure_side`]: "16.02", [`sensor.${P}_low_pressure_side`]: "6.74" });
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-action" ? "detail" : null) }] });
  assert.match(html(c), /16,0 bar/);
  assert.match(html(c), /6,7 bar/);
  assert.match(html(c), /‹ Tillbaka/);
});

test("clicking a value opens more-info for its entity", () => {
  const c = card();
  let fired = null;
  c.dispatchEvent = (ev) => { fired = ev; return true; };
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-entity" ? "sensor.x" : null) }] });
  assert.equal(fired.type, "hass-more-info");
  assert.equal(fired.detail.entityId, "sensor.x");
});

test("English labels", () => {
  const m = card({}, {}, "en")._model();
  assert.match(m.why, /^Running since (yesterday )?\d\d:\d\d$/);
});

test("only relevant state changes re-render", () => {
  const c = card();
  let renders = 0;
  const orig = c._render.bind(c);
  c._render = () => { renders++; orig(); };
  c.hass = { states: { ...states(), "sensor.unrelated": { state: "1", attributes: {} } }, locale: { language: "sv" } };
  assert.equal(renders, 0);
  c.hass = { states: states({ [`sensor.${P}_compressor_current_gear`]: "5" }), locale: { language: "sv" } };
  assert.equal(renders, 1);
});

test("helpers", () => {
  assert.equal(fmt(2.06, 1, "°C", "sv"), "2,1 °C");
  assert.equal(fmt(null), "–");
  assert.equal(tankColor(60).dark, true);
  assert.equal(tankColor(25).dark, false);
  assert.ok(DEFAULT_ENTITIES.brine_in.startsWith("sensor."));
});

test("compact mode keeps an immersion heater row", () => {
  const c = card({ "sensor.immersion_step": "2" });
  c._compact = true;
  c._render();
  const h = html(c);
  assert.match(h, /class="wrap compact"/);
  assert.match(h, /class="short imm-compact" data-entity="sensor.immersion_step"[\s\S]*?>Elpatron</);
  assert.equal(count(h, 'fill="#d9822b"'), 4);
});

test("immersion heater steps are drawn like gears", () => {
  const c = card({ "sensor.immersion_step": "2" }, { immersion_steps: 3, immersion_step_kw: 3 });
  const m = c._model();
  assert.deepEqual(m.immersion.steps, [true, true, false]);
  assert.equal(m.immersion.text, "6 kW");
  assert.ok(!html(c).includes("steg"));
  assert.equal(count(html(c), 'fill="#d9822b"'), 4);   // two steps, full and compact bars
  const off = card()._model().immersion;
  assert.deepEqual(off.steps, [false, false, false]);
  assert.equal(off.text, "");
});

test("brine and condenser pumps are drawn as symbols filled to their speed", () => {
  const h = html(card());
  assert.equal(count(h, 'class="pump"'), 2);
  assert.match(h, /data-entity="sensor.diplomat_inverter_duo_brine_circulation_pump_speed">62 %</);
  assert.match(h, /data-entity="sensor.diplomat_inverter_duo_condenser_circulation_pump_speed">55 %</);
  assert.equal(count(h, 'class="spin"'), 2);
  assert.ok(!h.includes(">Brinepump<"));
  const idle = html(card({ "sensor.diplomat_inverter_duo_brine_circulation_pump_speed": "0" }));
  assert.equal(count(idle, 'class="spin"'), 1);
});

test("since: today as a time, then yesterday, then a date", () => {
  const { sinceWhen } = require("../dist/calibra-card.js");
  const t = { yesterday: "igår" }, now = new Date(2026, 9, 25, 17, 40);
  assert.equal(sinceWhen(new Date(2026, 9, 25, 17, 23).toISOString(), "sv", t, now), "17:23");
  assert.equal(sinceWhen(new Date(2026, 9, 24, 22, 5).toISOString(), "sv", t, now), "igår 22:05");
  assert.equal(sinceWhen(new Date(2026, 9, 21, 9, 0).toISOString(), "sv", t, now), "21 okt 09:00");
});

test("the tank opens a chart of its top and bottom temperatures", async () => {
  const now = Date.now() / 1000;
  const rows = (v0, v1) => Array.from({ length: 50 }, (_, i) => ({ s: String(v0 + (v1 - v0) * i / 49), lu: now - 72 * 3600 + i * 5000 }));
  const c = card({ [`number.${P}_start_temperature_tap_water`]: "40", [`number.${P}_stop_temperature_tap_water`]: "55" });
  const asked = [];
  c._hass.callWS = async (msg) => {
    asked.push(msg);
    return { [`sensor.${P}_tap_water_top_temperature`]: rows(46, 61.5), [`sensor.${P}_tap_water_lower_temperature`]: [{ s: "unavailable", lu: now - 3600 }, ...rows(42, 58)] };
  };
  // the tank in the diagram is a button now, not two more-info links
  assert.match(html(c), /<g class="tank" data-action="tank" tabindex="0" role="button"/);
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-action" ? "tank" : null) }] });
  assert.match(html(c), /Varmvattentanken/);
  assert.match(html(c), /Hämtar historik…/);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(asked[0].type, "history/history_during_period");
  assert.deepEqual(asked[0].entity_ids, [`sensor.${P}_tap_water_top_temperature`, `sensor.${P}_tap_water_lower_temperature`]);
  const h = html(c);
  assert.equal(count(h, 'class="tl '), 2);
  assert.match(h, /Laddning startar under 40 °C, slutar vid 55 °C/);
  assert.equal(count(h, 'class="lim"'), 2);
  assert.match(h, /data-entity="sensor\.diplomat_inverter_duo_tap_water_top_temperature"/);
  assert.match(h, /aria-pressed="true">3 dygn</);
  assert.ok(!h.includes("NaN"));
  // another period fetches again; the back button returns to the diagram
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-action" ? "tankrange" : a === "data-hours" ? "168" : null) }] });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(asked.length, 4, "each fetch asks for the tank and for the demand history");
  assert.match(html(c), /aria-pressed="true">7 dygn</);
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-action" ? "detail" : null) }] });
  assert.doesNotMatch(html(c), /Varmvattentanken/);
  assert.match(html(c), /data-action="tank"/);
});

test("tankPoints skips states that are not numbers", () => {
  const { tankPoints } = require("../dist/calibra-card.js");
  assert.deepEqual(tankPoints([{ s: "50.5", lu: 10 }, { s: "unavailable", lu: 11 }, { s: "51", lc: 12 }]), [[10000, 50.5], [12000, 51]]);
});

test("legionella cycles are shaded, with the last one and roughly when the next is due", async () => {
  const now = Date.now() / 1000, day = 86400;
  const rows = Array.from({ length: 50 }, (_, i) => ({ s: String(50 + i % 5), lu: now - 3 * day + i * 5000 }));
  // cycles 8 and 1 day(s) ago, an hour each: the next one is due in about 6 days
  const demand = [{ s: "Heat", lu: now - 15 * day }, { s: "Anti legionella", lu: now - 8 * day }, { s: "Heat", lu: now - 8 * day + 3600 },
    { s: "Anti legionella", lu: now - 1 * day }, { s: "Heat", lu: now - 1 * day + 3600 }];
  const c = card();
  c._hass.callWS = async (msg) => msg.entity_ids.includes(`sensor.${P}_first_prioritised_demand`)
    ? { [`sensor.${P}_first_prioritised_demand`]: demand }
    : { [`sensor.${P}_tap_water_top_temperature`]: rows, [`sensor.${P}_tap_water_lower_temperature`]: rows };
  c._onClick({ composedPath: () => [{ getAttribute: (a) => (a === "data-action" ? "tank" : null) }] });
  await new Promise((r) => setTimeout(r, 0));
  const h = html(c);
  assert.equal(count(h, 'class="legio"'), 1, "only the run inside the 3-day window is drawn");
  assert.match(h, /Legionella senast [^<]*, nästa omkring /);
  const { legionellaRuns, nextLegionella } = require("../dist/calibra-card.js");
  const runs = legionellaRuns(demand, now * 1000);
  assert.equal(runs.length, 2);
  assert.equal(nextLegionella(runs), (now - 1 * day + 7 * day) * 1000);
  // a cycle that is still running
  const running = legionellaRuns([{ s: "Heat", lu: 1 }, { s: "Anti legionella", lu: 100 }], 500000);
  assert.deepEqual(running, [{ start: 100000, end: 500000, ongoing: true }]);
});
