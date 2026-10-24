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
  for (const [k, v] of Object.entries(base)) out[k] = { state: v, attributes: k === "sensor.price" ? { unit_of_measurement: "kr/kWh" } : {} };
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

test("heating: radiator branch live, valve points right, demand translated", () => {
  const c = card();
  const m = c._model();
  assert.equal(m.heatOn, true);
  assert.equal(m.hwOn, false);
  assert.equal(m.chip.text, "Värme");
  assert.equal(m.gearText, "Växel 4 av 10");
  assert.match(m.why, /ingen begränsning/);
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
  assert.equal(m.gearText, "Växel 3 av 3 tillåtna");
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
  assert.equal(m.gearText, "Står still");
  assert.match(m.why, /gradminuter −150|gradminuter -150/);
  assert.equal(m.brineOn, false);
  assert.ok(!html(c).includes('stroke="#2f6fb3"'));
});

test("an alarm overrides everything else", () => {
  const m = card({ [`binary_sensor.${P}_sum_alarm`]: "on" })._model();
  assert.equal(m.tone, "alert");
  assert.match(m.why, /larm/);
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
  assert.equal(m.gearText, "Gear 4 of 10");
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
