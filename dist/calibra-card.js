/*
 * Calibra Card
 * https://github.com/JanJoh/calibra-card
 *
 * A Lovelace card for a Thermia Calibra / Diplomat Inverter ground source heat pump read
 * through the thermiagenesis integration: borehole, compressor, the diverting valve between
 * the radiator circuit and the TWC tank, and a separate water heater in series after the tank.
 *
 * MIT License
 */

const CARD_VERSION = "0.1.0";

// Entity defaults: the thermiagenesis entity ids. Anything else (power meter, price, the
// valve, the water heater) is site specific and only shown when configured.
const TG = "diplomat_inverter_duo";
const DEFAULT_ENTITIES = {
  outdoor: `sensor.${TG}_outdoor_temperature`,
  demand: `sensor.${TG}_first_prioritised_demand`,
  compressor_running: `binary_sensor.${TG}_compressor_control_signal`,
  compressor_pct: `sensor.${TG}_compressor_speed_percent`,
  compressor_rpm: `sensor.${TG}_compressor_speed_rpm`,
  gear: `sensor.${TG}_compressor_current_gear`,
  gears_available: `sensor.${TG}_compressor_available_gears`,
  gear_max_heat: `number.${TG}_maximum_allowed_gear_in_heating`,
  gear_max_tap: `number.${TG}_maximum_allowed_gear_in_tap_water`,
  gear_min_tap: `number.${TG}_minimum_allowed_gear_in_tap_water`,
  compressor_blocked: `sensor.${TG}_compressor_temporarily_blocked`,
  brine_in: `sensor.${TG}_brine_in_temperature`,
  brine_out: `sensor.${TG}_brine_out_temperature`,
  brine_pump: `sensor.${TG}_brine_circulation_pump_speed`,
  condenser_pump: `sensor.${TG}_condenser_circulation_pump_speed`,
  condenser_in: `sensor.${TG}_condenser_in_temperature`,
  condenser_out: `sensor.${TG}_condenser_out_temperature`,
  tank_top: `sensor.${TG}_tap_water_top_temperature`,
  tank_bottom: `sensor.${TG}_tap_water_lower_temperature`,
  heating_season_active: `binary_sensor.${TG}_heating_season_active`,
  heating_season_stop: `number.${TG}_heating_season_stop_temperature`,
  integral: `sensor.${TG}_heating_season_integral_value`,
  alarm: `binary_sensor.${TG}_sum_alarm`,
  high_pressure: `sensor.${TG}_high_pressure_side`,
  low_pressure: `sensor.${TG}_low_pressure_side`,
  bubble_point: `sensor.${TG}_bubble_point`,
  dew_point: `sensor.${TG}_dew_point`,
  compressor_hours: `sensor.${TG}_compressor_operating_hours`,
  tap_water_hours: `sensor.${TG}_tap_water_operating_hours`,
  gear_min_heat: `number.${TG}_minimum_allowed_gear_in_heating`,
  phase_alarm: `binary_sensor.${TG}_power_input_phase_detection_alarm`,
};

const COLORS = {
  brineIn: "#2f6fb3", brineOut: "#8db8e3",
  heat: "#d9622b", heatRet: "#f0a77f",
  hw: "#d0453a", hwRet: "#ec9a92",
  tap: "#d0453a", idle: "var(--calibra-idle, #c9cdd2)",
  gear: "#2f6fb3", gearLimited: "#b26b00",
};

const T = {
  sv: {
    title: "Värmepump", borehole: "Borrhål", in: "In", out: "Ut", compressor: "Kompressor",
    gearOf: (g, m) => `Växel ${g} av ${m}`, gearOfAllowed: (g, m) => `Växel ${g} av ${m} tillåtna`,
    stopped: "Står still", brinePump: "Brinepump", condPump: "Kondensorpump", immersion: "Intern elpatron",
    off: "av", on: "på", step: (s) => `steg ${s}`, circuit: "Kylkrets ›", radiators: "Radiatorer", supply: "Fram", ret: "Retur",
    valve: "Ventil →", toHeat: "värme", toTap: "varmvatten", heater: "Beredare", heaterSub: "Egen termostat",
    heaterIdle: "vilar", heaterOn: "värmer", taps: "Kranar", outdoor: "Ute", power: "Effekt nu", price: "Elpris",
    heatStopOn: (t) => `Värmestopp på${t}`, heatStopOff: (t) => `Värmestopp av${t}`, limit: (t) => ` (${t})`, gearShort: (g, m) => `Växel ${g}/${m}`,
    pumpToday: "Värmepump el idag", heaterToday: "Beredare idag", brineMin: "Lägsta brine idag", immHours: "Intern elpatron, totalt",
    back: "‹ Tillbaka", hp: "Högtryck (kondensor)", lp: "Lågtryck (förångare)", bubble: "Bubbelpunkt", dew: "Daggpunkt",
    compHours: "Kompressor, drifttid", tapHours: "Varmvatten, drifttid", gearsHeat: "Tillåtna växlar, värme",
    gearsTap: "Tillåtna växlar, varmvatten", blocked: "Tillfälligt blockerad", yes: "Ja", no: "Nej",
    alarm: "Samlingslarm", noAlarm: "Inget", active: "Aktivt", phaseAlarm: "Fasdetektering", ok: "OK", fault: "Fel",
    whyDemand: (d, g, m, lim) => `${d} · växel ${g} av ${m} tillåtna${lim ? "" : " · ingen begränsning"}`,
    whyIdle: (i) => `Inget behov just nu${i}`, integral: (v) => ` · gradminuter ${v}`,
    whyHeatStop: (o, s) => `Värmestopp: ute ${o} är över gränsen ${s}. Radiatorerna får ingen värme, bara varmvatten laddas vid behov.`,
    whyBlocked: "Kompressorn är tillfälligt blockerad.", whyImmersion: "Intern elpatron har gått in.",
    whyAlarm: "Värmepumpen har ett aktivt larm.",
    demands: { "No demand": "Inget behov", Heat: "Värme", "Hot water": "Varmvatten", "Anti legionella": "Legionella",
      Pool: "Pool", Cooling: "Kyla", "Passive cooling": "Passiv kyla", "Pool 2": "Pool 2", "Brine heating": "Brinevärmning" },
    heatStopChip: "Värmestopp",
  },
  en: {
    title: "Heat pump", borehole: "Borehole", in: "In", out: "Out", compressor: "Compressor",
    gearOf: (g, m) => `Gear ${g} of ${m}`, gearOfAllowed: (g, m) => `Gear ${g} of ${m} allowed`,
    stopped: "Stopped", brinePump: "Brine pump", condPump: "Condenser pump", immersion: "Immersion heater",
    off: "off", on: "on", step: (s) => `step ${s}`, circuit: "Refrigerant ›", radiators: "Radiators", supply: "Supply", ret: "Return",
    valve: "Valve →", toHeat: "heating", toTap: "hot water", heater: "Water heater", heaterSub: "Own thermostat",
    heaterIdle: "idle", heaterOn: "heating", taps: "Taps", outdoor: "Outdoor", power: "Power", price: "Price",
    heatStopOn: (t) => `Heating stop on${t}`, heatStopOff: (t) => `Heating stop off${t}`, limit: (t) => ` (${t})`, gearShort: (g, m) => `Gear ${g}/${m}`,
    pumpToday: "Heat pump today", heaterToday: "Water heater today", brineMin: "Lowest brine today", immHours: "Immersion heater, total",
    back: "‹ Back", hp: "High pressure (condenser)", lp: "Low pressure (evaporator)", bubble: "Bubble point", dew: "Dew point",
    compHours: "Compressor hours", tapHours: "Hot water hours", gearsHeat: "Allowed gears, heating",
    gearsTap: "Allowed gears, hot water", blocked: "Temporarily blocked", yes: "Yes", no: "No",
    alarm: "Sum alarm", noAlarm: "None", active: "Active", phaseAlarm: "Phase detection", ok: "OK", fault: "Fault",
    whyDemand: (d, g, m, lim) => `${d} · gear ${g} of ${m} allowed${lim ? "" : " · no limit"}`,
    whyIdle: (i) => `No demand right now${i}`, integral: (v) => ` · degree minutes ${v}`,
    whyHeatStop: (o, s) => `Heating stop: outdoor ${o} is above the limit ${s}. Only hot water is made when needed.`,
    whyBlocked: "The compressor is temporarily blocked.", whyImmersion: "The immersion heater is on.",
    whyAlarm: "The heat pump has an active alarm.",
    demands: {},
    heatStopChip: "Heating stop",
  },
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function num(hass, id) {
  const s = id && hass?.states?.[id];
  if (!s) return null;
  const v = parseFloat(s.state);
  return Number.isFinite(v) ? v : null;
}

function str(hass, id) {
  const s = id && hass?.states?.[id];
  if (!s || s.state === "unknown" || s.state === "unavailable") return null;
  return s.state;
}

function isOn(hass, id) {
  return str(hass, id) === "on";
}

function fmt(v, digits = 1, unit = "", lang = "sv") {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  const s = v.toLocaleString(lang === "sv" ? "sv-SE" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return unit ? `${s}${unit === "°" ? "" : " "}${unit}` : s;
}

function fmtPower(w, lang) {
  if (w === null) return "–";
  return Math.abs(w) >= 1000 ? fmt(w / 1000, 2, "kW", lang) : fmt(w, 0, "W", lang);
}

// Tank colour from its temperature: pale at 20 °C, deep red at 60 °C.
function tankColor(t) {
  const a = [246, 211, 196], b = [192, 57, 43];
  const k = t === null ? 0 : Math.max(0, Math.min(1, (t - 20) / 40));
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * k));
  return { css: `rgb(${c.join(",")})`, dark: k > 0.45 };
}

class CalibraCard extends HTMLElement {
  static getStubConfig() {
    return { borehole_depth: 88 };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = {
      borehole_depth: null,
      notices: [],
      ...config,
      entities: { ...DEFAULT_ENTITIES, ...(config.entities || {}) },
    };
    this._detail = false;
    this._stats = {};
    this._statsAt = 0;
    this._sig = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
    if (Date.now() - this._statsAt > 5 * 60 * 1000) this._fetchStats();
  }

  getCardSize() {
    return 8;
  }

  getGridOptions() {
    return { columns: "full", min_columns: 6, rows: "auto" };
  }

  get _lang() {
    const l = this._hass?.locale?.language || this._hass?.language || "sv";
    return l.startsWith("sv") ? "sv" : "en";
  }

  get _t() {
    return T[this._lang];
  }

  _signature() {
    const e = this._config?.entities || {};
    const ids = [...Object.values(e).flat(), ...(this._config?.notices || []).map((n) => n.entity)];
    return ids.map((id) => (id && this._hass?.states?.[id]?.state) ?? "").join("|") + `|${this._detail}`;
  }

  // Today's energy and lowest brine temperature come from long-term statistics.
  async _fetchStats() {
    const hass = this._hass;
    if (!hass?.callWS) return;
    this._statsAt = Date.now();
    const e = this._config.entities;
    const ask = async (id, type) => {
      if (!id || !hass.states[id]) return null;
      try {
        const r = await hass.callWS({ type: "recorder/statistic_during_period", statistic_id: id, calendar: { period: "day" }, types: [type] });
        return r?.[type] ?? null;
      } catch (_) {
        return null;
      }
    };
    const [pump, heater, brine] = await Promise.all([ask(e.energy, "change"), ask(e.heater_energy, "change"), ask(e.brine_in, "min")]);
    this._stats = { pump, heater, brine };
    this._render();
  }

  _model() {
    const hass = this._hass, e = this._config.entities, t = this._t, lang = this._lang;
    const n = (k) => num(hass, e[k]);
    const demandRaw = str(hass, e.demand);
    const demand = demandRaw ? (t.demands[demandRaw] || demandRaw) : "–";
    const running = e.compressor_running ? isOn(hass, e.compressor_running) : (n("compressor_pct") || 0) > 0;
    const valveTap = e.valve ? isOn(hass, e.valve) : demandRaw === "Hot water" || demandRaw === "Anti legionella";
    const heatOn = running && !valveTap;
    const hwOn = running && valveTap;
    const brineOn = (n("brine_pump") ?? (running ? 1 : 0)) > 0;
    const gear = Math.round(n("gear") ?? 0);
    const gears = Math.round(n("gears_available") ?? 10) || 10;
    const maxKey = valveTap ? "gear_max_tap" : "gear_max_heat";
    const maxAllowed = Math.round(n(maxKey) ?? gears);
    const limited = maxAllowed < gears;
    const immersion = e.immersion ? (str(hass, e.immersion) === "on" || (num(hass, e.immersion) || 0) > 0) : false;
    const blocked = (n("compressor_blocked") || 0) > 0;
    const alarm = isOn(hass, e.alarm);
    const seasonActive = e.heating_season_active ? isOn(hass, e.heating_season_active) : true;
    const heatStop = e.heating_season_active && str(hass, e.heating_season_active) !== null && !seasonActive;
    const stopT = n("heating_season_stop");
    const outdoor = n("outdoor");

    // The explanation line: what limits the pump right now, most important first.
    const notices = (this._config.notices || [])
      .filter((x) => x && x.entity && str(hass, x.entity) === String(x.state ?? "on"))
      .map((x) => x.text);
    let why, tone = "neutral";
    if (alarm) { why = t.whyAlarm; tone = "alert"; }
    else if (heatStop && !running) { why = t.whyHeatStop(fmt(outdoor, 1, "°C", lang), fmt(stopT, 0, "°C", lang)); tone = "stop"; }
    else if (running) why = t.whyDemand(demand, gear, maxAllowed, limited || notices.length);
    else why = t.whyIdle(n("integral") !== null ? t.integral(fmt(n("integral"), 0, "", lang)) : "");
    const extra = [...notices];
    if (blocked) extra.push(t.whyBlocked);
    if (immersion) extra.push(t.whyImmersion);
    if (extra.length) {
      why = `${why}. ${extra.join(" ")}`.replace(/\.\. /, ". ");
      if (tone === "neutral") tone = "warn";
    }

    const segs = [];
    for (let i = 1; i <= gears; i++) {
      segs.push(running && i <= gear ? (limited || notices.length ? "on-limited" : "on") : i > maxAllowed ? "blocked" : "off");
    }

    const tankTop = n("tank_top"), tankBot = n("tank_bottom");
    const heaterW = num(hass, e.heater_power);
    let chip = { text: demand, tone: "neutral" };
    if (heatStop && !running) chip = { text: t.heatStopChip, tone: "stop" };
    else if (demandRaw === "Heat") chip.tone = "heat";
    else if (demandRaw === "Hot water" || demandRaw === "Anti legionella") chip.tone = "hw";

    const immHours = (Array.isArray(e.immersion_hours) ? e.immersion_hours : e.immersion_hours ? [e.immersion_hours] : [])
      .map((id) => num(hass, id));

    return {
      chip, why, tone,
      outdoor: fmt(outdoor, 1, "°C", lang),
      power: e.power ? fmtPower(num(hass, e.power), lang) : null,
      price: e.price ? `${fmt(num(hass, e.price), 2, "", lang)} ${hass?.states?.[e.price]?.attributes?.unit_of_measurement || ""}`.trim() : null,
      brineIn: fmt(n("brine_in"), 1, "°", lang), brineOut: fmt(n("brine_out"), 1, "°", lang),
      brineDt: n("brine_in") !== null && n("brine_out") !== null ? fmt(n("brine_in") - n("brine_out"), 1, "", lang) : "–",
      brineOn, heatOn, hwOn, valveTap, segs, limited: limited || notices.length > 0,
      gearShort: running ? t.gearShort(gear, maxAllowed) : t.stopped,
      gearText: running ? (limited ? t.gearOfAllowed(gear, maxAllowed) : t.gearOf(gear, gears)) : t.stopped,
      speed: `${fmt(n("compressor_pct"), 0, "%", lang)} · ${fmt(n("compressor_rpm"), 0, "rpm", lang)}`,
      brinePump: fmt(n("brine_pump"), 0, "%", lang), condPump: fmt(n("condenser_pump"), 0, "%", lang),
      immersion: e.immersion ? { on: immersion, text: !immersion ? t.off : str(hass, e.immersion) === "on" ? t.on : t.step(str(hass, e.immersion)) } : null,
      supply: heatOn || heatStop ? fmt(n("condenser_out"), 1, "°", lang) : fmt(n("condenser_out"), 1, "°", lang),
      ret: fmt(n("condenser_in"), 1, "°", lang),
      heatDt: n("condenser_out") !== null && n("condenser_in") !== null ? fmt(n("condenser_out") - n("condenser_in"), 1, "", lang) : "–",
      heatStop, seasonKnown: !!e.heating_season_active && str(hass, e.heating_season_active) !== null,
      stopLimit: stopT !== null ? t.limit(fmt(stopT, 0, "°C", lang)) : "",
      tankTop: fmt(tankTop, 1, "°", lang), tankBot: fmt(tankBot, 1, "°", lang),
      tankTopC: tankColor(tankTop), tankBotC: tankColor(tankBot),
      heater: e.heater_power ? { on: (heaterW || 0) > 20, short: fmtPower(heaterW, lang), text: `${fmtPower(heaterW, lang)} · ${(heaterW || 0) > 20 ? t.heaterOn : t.heaterIdle}` } : null,
      stats: {
        pump: e.energy ? fmt(this._stats.pump, 1, "kWh", lang) : null,
        heater: e.heater_energy ? fmt(this._stats.heater, 1, "kWh", lang) : null,
        brine: fmt(this._stats.brine, 1, "°C", lang),
        imm: immHours.length ? immHours.map((h) => fmt(h, 0, "h", lang)).join(" · ") : null,
      },
    };
  }

  _detailModel() {
    const hass = this._hass, e = this._config.entities, t = this._t, lang = this._lang;
    const n = (k) => num(hass, e[k]);
    const rng = (a, b) => `${n(a) ?? "–"}–${n(b) ?? "–"}`;
    return [
      ["hp", fmt(n("high_pressure"), 1, "bar", lang), `${t.bubble} ${fmt(n("bubble_point"), 1, "°C", lang)}`, "high_pressure", "warm"],
      ["lp", fmt(n("low_pressure"), 1, "bar", lang), `${t.dew} ${fmt(n("dew_point"), 1, "°C", lang)}`, "low_pressure", "cold"],
    ].map(([k, v, sub, ent, kind]) => ({ label: t[k], value: v, sub, entity: e[ent], kind }))
      .concat([{ rows: [
        [t.compHours, fmt(n("compressor_hours"), 0, "h", lang), e.compressor_hours],
        [t.tapHours, fmt(n("tap_water_hours"), 0, "h", lang), e.tap_water_hours],
        [t.gearsHeat, rng("gear_min_heat", "gear_max_heat"), e.gear_max_heat],
        [t.gearsTap, rng("gear_min_tap", "gear_max_tap"), e.gear_max_tap],
        [t.blocked, (n("compressor_blocked") || 0) > 0 ? t.yes : t.no, e.compressor_blocked],
        null,
        [t.alarm, isOn(hass, e.alarm) ? t.active : t.noAlarm, e.alarm],
        ...(e.alarm_classes || []).map((id) => [hass?.states?.[id]?.attributes?.friendly_name || id, isOn(hass, id) ? t.active : t.off, id]),
        [t.phaseAlarm, isOn(hass, e.phase_alarm) ? t.fault : t.ok, e.phase_alarm],
      ] }]);
  }

  _svg(m) {
    const t = this._t, c = COLORS, e = this._config.entities;
    const col = {
      bIn: m.brineOn ? c.brineIn : c.idle, bOut: m.brineOn ? c.brineOut : c.idle,
      heat: m.heatOn ? c.heat : c.idle, heatRet: m.heatOn ? c.heatRet : c.idle,
      hw: m.hwOn ? c.hw : c.idle, hwRet: m.hwOn ? c.hwRet : c.idle,
      sup: m.heatOn ? c.heat : m.hwOn ? c.hw : c.idle, tap: c.tap,
    };
    const pipe = (x1, y1, x2, y2, color) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
    const arrow = (x, y, rot, color) => `<path d="M-3 -4.5l5 4.5-5 4.5" transform="translate(${x} ${y}) rotate(${rot})" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const txt = (x, y, s, cls = "", ent = "", anchor = "start") =>
      `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}"${ent ? ` data-entity="${esc(ent)}"` : ""}>${esc(s)}</text>`;
    const depth = this._config.borehole_depth;

    // Gear segments
    const segW = (160 - 3 * (m.segs.length - 1)) / m.segs.length;
    const segs = m.segs.map((s, i) => {
      const fill = s === "on" ? c.gear : s === "on-limited" ? c.gearLimited : s === "blocked" ? "url(#hatch)" : "var(--calibra-seg, #e3e6ea)";
      return `<rect x="${185 + i * (segW + 3)}" y="88" width="${segW.toFixed(2)}" height="14" rx="3" fill="${fill}"/>`;
    }).join("");

    const tankId = "tg";
    const hpRows = [
      [t.brinePump, m.brinePump, e.brine_pump],
      [t.condPump, m.condPump, e.condenser_pump],
    ];
    return `
<svg viewBox="0 34 712 296" role="img" aria-label="${esc(t.title)}">
  <defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="var(--card-background-color, #fff)"/><rect width="3" height="6" fill="var(--calibra-seg, #e3e6ea)"/>
    </pattern>
    <linearGradient id="${tankId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${m.tankTopC.css}"/><stop offset="1" stop-color="${m.tankBotC.css}"/>
    </linearGradient>
  </defs>

  ${txt(0, 48, t.borehole, "lbl strong")}
  <rect x="0" y="60" width="44" height="10" fill="#ece4d6"/><line x1="0" y1="61" x2="44" y2="61" stroke="#8c7b62" stroke-width="2"/>
  <rect x="0" y="72" width="44" height="230" fill="var(--calibra-rock, #dde2e8)"/>
  ${depth ? txt(0, 318, `${depth} m`, "lbl") : ""}
  ${pipe(16, 160, 16, 292, col.bOut)}${pipe(30, 120, 30, 292, col.bIn)}${pipe(16, 292, 30, 292, col.bOut)}
  ${pipe(30, 120, 170, 120, col.bIn)}${pipe(16, 160, 170, 160, col.bOut)}
  ${txt(60, 110, `${t.in} ${m.brineIn}`, "val", e.brine_in)}
  ${txt(60, 145, `ΔT ${m.brineDt}`, "lbl opt")}
  ${txt(60, 180, `${t.out} ${m.brineOut}`, "val", e.brine_out)}

  <g class="hp" data-action="detail" tabindex="0" role="button" aria-label="${esc(t.circuit)}">
    <rect x="170" y="56" width="190" height="248" rx="12" class="box hpbox"/>
    ${txt(185, 78, t.compressor, "lbl")}
    ${segs}
    ${txt(185, 124, m.gearText, "val big full", e.gear)}${txt(185, 128, m.gearShort, "val big short", e.gear)}
    ${txt(185, 142, m.speed, "lbl opt", e.compressor_pct)}
    <line x1="185" y1="154" x2="345" y2="154" class="div opt"/>
    ${hpRows.map(([l, v, ent], i) => `${txt(185, 174 + i * 20, l, "lbl opt")}${txt(345, 174 + i * 20, v, "sm opt", ent, "end")}`).join("")}
    ${m.immersion ? `<g class="opt">${m.immersion.on ? `<rect x="179" y="203" width="172" height="20" rx="6" fill="var(--calibra-warn-bg, #fff4dc)"/>` : ""}
      ${txt(185, 217, t.immersion, m.immersion.on ? "sm warn" : "lbl")}${txt(345, 217, m.immersion.text, m.immersion.on ? "sm warn strong" : "sm", e.immersion, "end")}</g>` : ""}
    ${txt(185, 248, t.circuit, "link")}
  </g>

  ${pipe(360, 78, 560, 78, col.heatRet)}
  ${pipe(360, 110, 400, 110, col.sup)}
  <circle cx="418" cy="110" r="17" class="valve" stroke="${col.sup}"/>
  <path d="M-7 0h12M1 -5l5 5-5 5" transform="translate(418 110) rotate(${m.valveTap ? 90 : 0})" fill="none" class="valve-arrow" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${e.valve ? ` data-entity="${esc(e.valve)}"` : ""}/>
  ${pipe(436, 110, 560, 110, col.heat)}
  ${pipe(418, 128, 418, 206, col.hw)}${pipe(418, 206, 470, 206, col.hw)}
  <g${e.valve ? ` data-entity="${esc(e.valve)}"` : ""}><rect x="430" y="146" width="122" height="20" rx="10" class="pill opt"/>${txt(491, 160, `${t.valve} ${m.valveTap ? t.toTap : t.toHeat}`, "xs opt", "", "middle")}</g>
  ${pipe(360, 292, 470, 292, col.hwRet)}

  <g class="${m.heatOn || m.heatStop ? "" : "dim"}">
    <rect x="560" y="52" width="152" height="118" rx="12" class="box"/>
    ${txt(572, 72, t.radiators, "lbl")}
    ${txt(572, 94, t.supply, "sm")}${txt(700, 94, m.supply, "val", e.condenser_out, "end")}
    ${txt(572, 114, t.ret, "sm")}${txt(700, 114, m.ret, "val", e.condenser_in, "end")}
    ${txt(572, 132, `ΔT ${m.heatDt}`, "lbl opt")}
  </g>
  ${m.seasonKnown ? `<g class="season" data-entity="${esc(e.heating_season_stop)}"><rect x="568" y="140" width="136" height="20" rx="10" class="pill ${m.heatStop ? "stop" : ""}"/>${txt(636, 154, (m.heatStop ? t.heatStopOn : t.heatStopOff)(m.stopLimit), `xs ${m.heatStop ? "stoptxt strong" : ""}`, "", "middle")}</g>` : ""}

  <rect x="470" y="180" width="72" height="140" rx="28" fill="url(#${tankId})" stroke="var(--divider-color, #c9cdd2)"/>
  ${txt(506, 206, m.tankTop, `val ${m.tankTopC.dark ? "light" : ""}`, e.tank_top, "middle")}
  ${txt(506, 254, "TWC", `xs opt ${m.tankTopC.dark ? "light" : ""}`, "", "middle")}
  ${txt(506, 304, m.tankBot, `val ${m.tankBotC.dark ? "light" : ""}`, e.tank_bottom, "middle")}

  ${m.heater ? `
  ${pipe(542, 198, 590, 198, col.tap)}
  <g data-entity="${esc(e.heater_power)}">
    <rect x="590" y="176" width="122" height="92" rx="12" class="box ${m.heater.on ? "warnbox" : ""}"/>
    ${txt(602, 196, t.heater, "lbl")}
    ${txt(602, 220, m.heater.text, `val full ${m.heater.on ? "warn" : ""}`)}${txt(602, 226, m.heater.short, `val short ${m.heater.on ? "warn" : ""}`)}
    ${txt(602, 240, t.heaterSub, "xs muted opt")}
  </g>
  ${pipe(651, 268, 651, 298, col.tap)}${txt(651, 316, t.taps, "lbl", "", "middle")}
  ${arrow(566, 198, 0, col.tap)}${arrow(651, 284, 90, col.tap)}` : `
  ${pipe(542, 198, 600, 198, col.tap)}${txt(606, 202, t.taps, "lbl")}${arrow(570, 198, 0, col.tap)}`}

  ${arrow(130, 120, 0, col.bIn)}${arrow(130, 160, 180, col.bOut)}
  ${arrow(16, 230, 90, col.bOut)}${arrow(30, 230, 270, col.bIn)}
  ${arrow(380, 110, 0, col.sup)}${arrow(500, 110, 0, col.heat)}${arrow(470, 78, 180, col.heatRet)}
  ${arrow(418, 172, 90, col.hw)}${arrow(446, 206, 0, col.hw)}${arrow(416, 292, 180, col.hwRet)}
</svg>`;
  }

  _html() {
    if (!this._hass || !this._config) return "";
    const t = this._t, e = this._config.entities;
    const m = this._model();
    const title = this._config.title ?? "Calibra";
    const stat = (label, value, ent) => value === null ? "" :
      `<div class="stat"${ent ? ` data-entity="${esc(ent)}"` : ""}><div class="lbl">${esc(label)}</div><div class="v">${esc(value)}</div></div>`;
    const head = [
      [t.outdoor, m.outdoor, e.outdoor],
      [t.power, m.power, e.power],
      [t.price, m.price, e.price],
    ].filter((x) => x[1] !== null).map(([l, v, ent]) => `<div class="hstat" data-entity="${esc(ent)}"><div class="lbl">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join("");

    let body;
    if (this._detail) {
      const d = this._detailModel();
      body = `<div class="detail">
        <div class="dhead"><div class="dtitle">${esc(t.circuit.replace(" ›", ""))}</div><button class="back" data-action="detail">${esc(t.back)}</button></div>
        <div class="dgrid">${d.slice(0, 2).map((x) => `<div class="dcard ${x.kind}" data-entity="${esc(x.entity)}"><div class="lbl">${esc(x.label)}</div><div class="v big">${esc(x.value)}</div><div class="lbl">${esc(x.sub)}</div></div>`).join("")}</div>
        <div class="drows">${d[2].rows.map((r) => r === null ? `<div class="hr"></div>` : `<div class="drow" data-entity="${esc(r[2])}"><span class="lbl">${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join("")}</div>
      </div>`;
    } else {
      body = `<div class="diagram">${this._svg(m)}</div>
      <div class="stats">
        ${stat(t.pumpToday, m.stats.pump, e.energy)}
        ${stat(t.heaterToday, m.stats.heater, e.heater_energy)}
        ${stat(t.brineMin, m.stats.brine, e.brine_in)}
        ${stat(t.immHours, m.stats.imm, Array.isArray(e.immersion_hours) ? e.immersion_hours[0] : e.immersion_hours)}
      </div>`;
    }
    return `
<ha-card>
  <div class="wrap${this._compact ? " compact" : ""}">
    <div class="head">
      <div class="tl"><div class="title">${esc(title)}</div><div class="chip ${m.chip.tone}" data-entity="${esc(e.demand)}">${esc(m.chip.text)}</div></div>
      <div class="hstats">${head}</div>
    </div>
    <div class="why ${m.tone}">${esc(m.why)}</div>
    ${body}
  </div>
</ha-card>`;
  }

  connectedCallback() {
    if (typeof ResizeObserver === "undefined" || this._ro) return;
    // Below ~560 px the full diagram's text gets too small; switch to a compact variant.
    this._ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0;
      const compact = w > 0 && w < 560;
      if (compact !== !!this._compact) { this._compact = compact; this._render(); }
    });
    this._ro.observe(this);
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener?.("click", (ev) => this._onClick(ev));
      this.shadowRoot.addEventListener?.("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && ev.target?.closest?.("[data-action]")) { ev.preventDefault(); this._onClick(ev); }
      });
    }
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>${this._html()}`;
  }

  _onClick(ev) {
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    for (const el of path) {
      if (!el?.getAttribute) continue;
      if (el.getAttribute("data-entity")) {
        this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: el.getAttribute("data-entity") } }));
        return;
      }
      if (el.getAttribute("data-action") === "detail") {
        this._detail = !this._detail;
        this._sig = null;
        this._render();
        return;
      }
    }
  }
}

const STYLE = `
:host { display: block; }
.wrap { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; color: var(--primary-text-color); }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.tl { display: flex; align-items: center; gap: 10px; }
.title { font-size: 20px; font-weight: 500; }
.chip { font-size: 13px; font-weight: 500; padding: 4px 10px; border-radius: 999px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--primary-text-color); }
.chip.heat { background: #fde7dc; color: #8a3412; }
.chip.hw { background: #fbe0de; color: #8c1d18; }
.chip.stop { background: #dff1ef; color: #00504a; }
.hstats { display: flex; gap: 18px; }
.hstat { display: flex; flex-direction: column; align-items: flex-end; cursor: pointer; }
.lbl { font-size: 11px; color: var(--secondary-text-color); }
.v { font-size: 16px; font-weight: 500; }
.v.big { font-size: 18px; }
.why { font-size: 13px; line-height: 1.4; padding: 8px 12px; border-radius: 8px; background: var(--secondary-background-color); }
.why.warn { background: #fff4dc; color: #6b4500; }
.why.stop { background: #e8f4f3; color: #00504a; }
.why.alert { background: #fde7e7; color: #8c1d18; }
.short { display: none; }
.compact .full, .compact .opt, .compact .season { display: none; }
.compact .short { display: inline; }
.compact svg text { font-size: 20px; }
.compact svg text.lbl, .compact svg text.link { font-size: 18px; }
.compact svg text.sm { font-size: 17px; }
.compact svg text.val, .compact svg text.big { font-size: 22px; }
.compact .hstats { width: 100%; justify-content: space-between; }
.compact .hstat { align-items: flex-start; }
.diagram svg { width: 100%; height: auto; display: block; font-family: inherit; }
svg text { fill: var(--primary-text-color); font-size: 13px; }
svg text.lbl { fill: var(--secondary-text-color); font-size: 11px; }
svg text.sm { font-size: 12px; }
svg text.xs { font-size: 11px; }
svg text.val { font-size: 13px; font-weight: 500; }
svg text.big { font-size: 15px; }
svg text.strong { font-weight: 500; }
svg text.light { fill: #fff; }
svg text.muted { fill: var(--secondary-text-color); }
svg text.warn { fill: #6b4500; }
svg text.stoptxt { fill: #00504a; }
svg text.link { fill: var(--primary-color); font-size: 12px; }
svg [data-entity] { cursor: pointer; }
svg .box { fill: var(--card-background-color, #fff); stroke: var(--divider-color, #d5d9de); }
svg .hpbox { fill: var(--secondary-background-color, #fafbfc); }
svg .box.warnbox { fill: #fff4dc; stroke: #e0b65c; }
svg .hp { cursor: pointer; outline: none; }
svg .hp:focus-visible .hpbox { stroke: var(--primary-color); stroke-width: 2; }
svg .div { stroke: var(--divider-color, #e3e6ea); }
svg .pill { fill: var(--secondary-background-color, #f1f3f4); }
svg .pill.stop { fill: #dff1ef; }
svg .valve { fill: var(--card-background-color, #fff); stroke-width: 2; }
svg .valve-arrow { stroke: var(--primary-text-color); }
svg .dim text { opacity: 0.6; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.stat { padding: 10px 12px; border-radius: 10px; background: var(--secondary-background-color); cursor: pointer; }
.detail { display: flex; flex-direction: column; gap: 12px; }
.dhead { display: flex; justify-content: space-between; align-items: center; }
.dtitle { font-size: 16px; font-weight: 500; }
.back { background: none; border: 0; color: var(--primary-color); font: inherit; font-size: 13px; cursor: pointer; padding: 8px; }
.dgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.dcard { padding: 12px; border-radius: 10px; cursor: pointer; }
.dcard.warm { background: rgba(217, 98, 43, 0.12); }
.dcard.cold { background: rgba(47, 111, 179, 0.12); }
.drows { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
.drow { display: flex; justify-content: space-between; cursor: pointer; }
.drow .lbl { font-size: 13px; }
.hr { height: 1px; background: var(--divider-color); }
`;

if (!customElements.get("calibra-card")) {
  customElements.define("calibra-card", CalibraCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "calibra-card",
    name: "Calibra Card",
    description: "Thermia Calibra ground source heat pump: borehole, compressor, diverting valve, tank and water heater.",
    documentationURL: "https://github.com/JanJoh/calibra-card",
  });
  console.info(`%c CALIBRA-CARD %c ${CARD_VERSION} `, "color:#fff;background:#d9622b;font-weight:600", "color:#d9622b;background:#fff");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CalibraCard, DEFAULT_ENTITIES, tankColor, fmt };   // for the tests
}
