# Calibra Card

A Lovelace card for a **Thermia Calibra / Diplomat Inverter** ground source heat pump, read locally over Modbus with the [thermiagenesis](https://github.com/JanJoh/thermiagenesis) integration.

It draws the system as it is actually plumbed:

- **Borehole:** brine in and out, ΔT, and the depth.
- **Compressor:** current gear against the allowed maximum (blocked gears are hatched) and speed.
- **Pumps:** the brine pump on the brine line and the condenser pump on the supply, each drawn as a pump whose ring fills with its speed. The impeller spins faster at higher speed; it stays still with reduced motion.
- **Internal immersion heater:** its active step, drawn as a bar like the gears.
- **Diverting valve:** splits the supply between the radiators and the TWC tank. The arrow turns and the inactive branch greys out.
- **Radiators:** supply, return, ΔT and heating stop (on/off and its limit).
- **TWC tank:** top and bottom temperature, coloured by temperature.
- **Optional separate water heater** in series after the tank, with its own thermostat, plus the taps.

Flow arrows show the circulation direction, and idle circuits turn grey. A line under the title explains **why** the pump is doing what it does. It reports a limited gear, a heating stop, a temporarily blocked compressor, the immersion heater coming on, an alarm, or your own notices (for example a sauna load guard).

Tap the compressor for the refrigerant circuit: pressures, dew and bubble point, operating hours, allowed gears and alarms. Every value opens its entity's more-info dialog.

| Heating | Hot water, limited by a load guard, immersion heater on |
|---|---|
| ![Heating](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/heat-light-760.png) | ![Hot water](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/hw-light-760.png) |

| Heating stop | Idle, dark theme |
|---|---|
| ![Heating stop](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/stop-light-760.png) | ![Idle](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/idle-dark-760.png) |

**Refrigerant circuit**: tap the compressor.

![Refrigerant circuit](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/heat-detail-light-760.png)

**Phone:** below 560 px the card switches to a compact diagram with larger text. The immersion heater row stays visible.

| Heating | Hot water, immersion heater on, dark theme |
|---|---|
| ![Phone, heating](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/heat-light-380.png) | ![Phone, hot water](https://raw.githubusercontent.com/JanJoh/calibra-card/main/images/hw-dark-380.png) |

Swedish and English follow the user's language. The screenshots use test data from `test/preview.html`.

## Installation

HACS → ⋮ → Custom repositories → `https://github.com/JanJoh/calibra-card`, category **Dashboard**. Install **Calibra Card**, then reload the browser.

## Configuration

The thermiagenesis entities (`*_diplomat_inverter_duo_*`) are used by default. Everything site specific is optional and only drawn when configured.

```yaml
type: custom:calibra-card
title: Calibra · bergvärme
borehole_depth: 88
entities:
  power: sensor.heat_pump_power        # W, shown in the header
  energy: sensor.heat_pump_energy      # kWh, "today" from statistics
  price: sensor.electricity_price
  valve: binary_sensor.hot_water_valve   # on = hot water
  heater_power: sensor.water_heater_power              # separate water heater
  heater_energy: sensor.water_heater_energy
  immersion: sensor.diplomat_inverter_duo_internal_additional_heater_current_step   # disabled by default in thermiagenesis
  immersion_hours:
    - sensor.thermia_auxiliary_heater_1_operational_time
    - sensor.thermia_auxiliary_heater_2_operational_time
  alarm_classes:
    - binary_sensor.calibra_alarm_active_class_d
    - binary_sensor.calibra_alarm_active_class_e
notices:
  - entity: input_boolean.load_guard
    text: Bastuvakten begränsar kompressorn.
```

| Option | Description |
|---|---|
| `title` | Card title (default `Calibra`). |
| `borehole_depth` | Depth in metres, written under the borehole. |
| `entities.<key>` | Override any entity. The keys are listed in `DEFAULT_ENTITIES` at the top of `dist/calibra-card.js`. |
| `entities.valve` | Binary sensor that is `on` while the valve points to hot water. Without it the card infers the valve position from the demand. |
| `entities.immersion` | Binary sensor (`on`) or step sensor (`> 0`) for the internal immersion heater. Thermiagenesis has these entities, but they are disabled by default. |
| `immersion_steps` | Number of immersion heater steps drawn as a bar like the compressor's gears (default `3`). |
| `immersion_step_kw` | Optional kW per step; shows the current power, e.g. "6 kW", next to the bar. |
| `notices` | A list of `{entity, state (default "on"), text}`. Each text is added to the explanation line while its entity is in that state. |

"Today" values (energy and the lowest brine temperature) come from long-term statistics and refresh every 5 minutes.

## Energy signature card

`custom:calibra-signature-card`, in the same file, compares the heat pump's daily electricity use against the daily mean outdoor temperature across periods, for example before and after replacing the pump. It reads hourly long-term statistics from the recorder, keeps only complete days, and draws:
- one series per period;
- a fitted curve per period;
- the value at a reference temperature, used as the finding.

```yaml
type: custom:calibra-signature-card
title: Gammal mot ny värmepump
energy: sensor.heat_pump_energy        # kWh, total_increasing
temperature: sensor.netatmo_outdoor_temperature            # °C, measurement
start: "2025-10-01"
reference: 5                                               # °C, where the finding is read
periods:
  - name: Gammal pump
    end: "2026-06-15"
  - name: Ny pump
    start: "2026-09-25"
```

The last period is drawn as the highlighted one. A curve's value at the reference temperature is shown only when that period has data on both sides of it.

## Development

```sh
node --test test/*.test.js
# screenshots of test/preview.html
docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && npm i -s playwright@1.49.1 >/dev/null; cd /w && NODE_PATH=/tmp/node_modules node test/shots.js'
```

MIT License.
