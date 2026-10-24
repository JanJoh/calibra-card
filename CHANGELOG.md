# Changelog

## 0.4.0 — 2026-10-24

- New card in the same file: `custom:calibra-signature-card`. It plots the energy signature, daily kWh against daily mean outdoor temperature from long-term statistics, with one coloured series and fitted curve per period, so an old and a new heat pump can be compared at the same temperature.

## 0.3.1 — 2026-10-24

- Empty gear and immersion segments, idle pipes and the borehole use theme-neutral translucent greys, so they stay visible on Home Assistant's default light and dark backgrounds (they almost vanished on the default light theme).

## 0.3.0 — 2026-10-24

- Brine and condenser pumps are drawn on their pipes as pump symbols: a ring filled to the speed, the percentage below, and an impeller that spins faster at higher speed (still with reduced motion). The pump rows in the compressor box are gone.
- The compressor box is shorter; the tank return enters it from below.

## 0.2.2 — 2026-10-24

- The immersion heater row drops its "steg X av Y" text too; the bar shows the step. With `immersion_step_kw` the row shows the current power instead. The whole row opens the sensor's more-info.

## 0.2.1 — 2026-10-24

- Removed the "Växel X av Y (tillåtna)" text from the compressor box and the explanation line; the gear bar already shows used and allowed gears. The compressor speed takes its place, and the box is tighter.

## 0.2.0 — 2026-10-24

- The internal immersion heater gets a step bar like the compressor's gears, in both layouts: "steg 1 av 3".
- New options: `immersion_steps` (default 3) and `immersion_step_kw`.

## 0.1.1 — 2026-10-24

- The compact layout (below 560 px) also shows the immersion heater row in the compressor box: "Elpatron av", or highlighted with the active step.

## 0.1.0 — 2026-10-24

First version:
- borehole, compressor with gear limits, diverting valve, radiators, TWC tank and an optional separate water heater;
- flow arrows, and an explanation line ("why") with notices;
- the refrigerant circuit view;
- compact layout below 560 px;
- Swedish and English.
